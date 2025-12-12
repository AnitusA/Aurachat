import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { uploadToSupabase, deleteFromSupabase } from '../services/supabase';
import { 
  PhotoIcon, MicrophoneIcon, PaperAirplaneIcon, 
  XMarkIcon, DocumentIcon, CheckIcon 
} from '@heroicons/react/24/outline';

const Messages = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    delete_after_24h: false,
    delete_after_viewing: false
  });
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (userId) => {
    try {
      const response = await api.get(`/messages/${userId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  // Fetch shared media
  const fetchSharedMedia = useCallback(async (userId) => {
    try {
      const response = await api.get(`/messages/shared-media/${userId}`);
      setSharedMedia(response.data.media || []);
    } catch (error) {
      console.error('Failed to fetch shared media:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
    
    // Cleanup expired messages every minute
    const cleanupInterval = setInterval(async () => {
      try {
        const response = await api.post('/messages/cleanup-expired');
        if (response.data.media_paths && response.data.media_paths.length > 0) {
          // Delete from Supabase
          for (const path of response.data.media_paths) {
            try {
              await deleteFromSupabase(path);
            } catch (err) {
              console.error('Error deleting from Supabase:', err);
            }
          }
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 60000); // Every minute

    return () => clearInterval(cleanupInterval);
  }, [fetchConversations]);

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user.id);
      fetchSharedMedia(selectedConversation.user.id);
    }
  }, [selectedConversation, fetchMessages, fetchSharedMedia]);

  // Socket.IO real-time messaging
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      // Add message if from current conversation
      if (selectedConversation && data.sender.id === selectedConversation.user.id) {
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      }
      
      // Update conversations list
      fetchConversations();
    };

    socket.on('receive_message', handleReceiveMessage);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, selectedConversation, fetchConversations]);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send text message
  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !audioBlob) || !selectedConversation) return;

    setIsSending(true);
    try {
      let messageData = {
        receiver_id: selectedConversation.user.id,
        content: newMessage.trim(),
        message_type: 'text',
        ...deleteOptions
      };

      // Handle audio message
      if (audioBlob) {
        const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        const { url, path } = await uploadToSupabase(audioFile, 'messages/audio');
        
        messageData = {
          ...messageData,
          message_type: 'audio',
          media_url: url,
          media_path: path,
          content: newMessage.trim() || 'Voice message'
        };
      }

      const response = await api.post('/messages', messageData);
      
      // Emit to socket for real-time delivery
      if (socket) {
        socket.emit('send_message', {
          ...response.data.message_data,
          recipient_id: selectedConversation.user.id
        });
      }

      setMessages(prev => [...prev, response.data.message_data]);
      setNewMessage('');
      setAudioBlob(null);
      
      // Reset delete options
      setDeleteOptions({
        delete_after_24h: false,
        delete_after_viewing: false
      });

      fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsSending(true);
    try {
      // Upload to Supabase
      const { url, path } = await uploadToSupabase(file, 'messages/images');

      // Send message with image
      const messageData = {
        receiver_id: selectedConversation.user.id,
        content: newMessage.trim() || 'Sent an image',
        message_type: 'image',
        media_url: url,
        media_path: path,
        ...deleteOptions
      };

      const response = await api.post('/messages', messageData);

      // Emit to socket
      if (socket) {
        socket.emit('send_message', {
          ...response.data.message_data,
          recipient_id: selectedConversation.user.id
        });
      }

      setMessages(prev => [...prev, response.data.message_data]);
      setNewMessage('');
      
      // Reset delete options
      setDeleteOptions({
        delete_after_24h: false,
        delete_after_viewing: false
      });

      fetchConversations();
      fetchSharedMedia(selectedConversation.user.id);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setIsSending(false);
    }
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied');
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Cancel audio recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
    }
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      const response = await api.put(`/messages/${messageId}/read`);
      
      // If message was deleted after viewing
      if (response.data.deleted && response.data.media_path) {
        await deleteFromSupabase(response.data.media_path);
        // Remove from messages
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 2rem)',
      padding: '1rem 0'
    }}>
      {/* Main Messages Container */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Profile Icons Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          overflowX: 'auto',
          minHeight: '90px',
          backgroundColor: 'var(--bg-card)'
        }}>
          {conversations.length === 0 ? (
            <div style={{
              width: '100%',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              No conversations yet
            </div>
          ) : (
            conversations.slice(0, 8).map((conv) => (
              <div
                key={conv.user.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  minWidth: '70px',
                  opacity: selectedConversation?.user.id === conv.user.id ? 1 : 0.6,
                  transition: 'opacity 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.25rem',
                    backgroundImage: conv.user.profile_pic && conv.user.profile_pic !== 'default.jpg'
                      ? `url(${conv.user.profile_pic})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: selectedConversation?.user.id === conv.user.id 
                      ? '3px solid var(--primary-color)' 
                      : '2px solid var(--border-color)'
                  }}>
                    {(!conv.user.profile_pic || conv.user.profile_pic === 'default.jpg')
                      && conv.user.username?.charAt(0).toUpperCase()}
                  </div>
                  {conv.unread_count > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#ff3b30',
                      color: 'white',
                      borderRadius: '50%',
                      minWidth: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '0 5px',
                      border: '2px solid var(--bg-card)'
                    }}>
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  marginTop: '0.5rem',
                  textAlign: 'center',
                  fontWeight: selectedConversation?.user.id === conv.user.id ? '600' : '400',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '70px'
                }}>
                  {conv.user.username}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedConversation ? (
          <>
            {/* Messages Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Messages Area */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Messages List */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: message.sender.id === user.id ? 'flex-end' : 'flex-start'
                      }}
                      onClick={() => {
                        if (!message.is_read && message.sender.id !== user.id) {
                          markAsRead(message.id);
                        }
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: message.message_type === 'text' ? '0.75rem 1rem' : '0.5rem',
                        borderRadius: '12px',
                        backgroundColor: message.sender.id === user.id
                          ? 'var(--primary-color)'
                          : 'var(--bg-secondary)',
                        color: message.sender.id === user.id
                          ? 'white'
                          : 'var(--text-primary)',
                        border: message.sender.id === user.id
                          ? 'none'
                          : '1px solid var(--border-color)'
                      }}>
                        {/* Image Message */}
                        {message.message_type === 'image' && (
                          <div>
                            <img 
                              src={message.media_url} 
                              alt="Shared" 
                              style={{
                                maxWidth: '100%',
                                borderRadius: '8px',
                                marginBottom: message.content ? '0.5rem' : 0
                              }}
                            />
                            {message.content && message.content !== 'Sent an image' && (
                              <div style={{ marginTop: '0.5rem' }}>{message.content}</div>
                            )}
                          </div>
                        )}
                        
                        {/* Audio Message */}
                        {message.message_type === 'audio' && (
                          <div>
                            <audio controls style={{ maxWidth: '100%' }}>
                              <source src={message.media_url} type="audio/webm" />
                            </audio>
                            {message.content && message.content !== 'Voice message' && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                {message.content}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Text Message */}
                        {message.message_type === 'text' && (
                          <div>{message.content}</div>
                        )}
                        
                        {/* Timestamp and Status */}
                        <div style={{
                          fontSize: '0.7rem',
                          opacity: 0.7,
                          marginTop: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {formatTime(message.created_at)}
                          {message.delete_after_24h && ' • 24h'}
                          {message.delete_after_viewing && ' • View once'}
                          {message.sender.id === user.id && message.is_read && (
                            <CheckIcon style={{ width: '12px', height: '12px' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Area */}
                <div style={{
                  padding: '1rem',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)'
                }}>
                  {/* Delete Options */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={deleteOptions.delete_after_24h}
                        onChange={(e) => setDeleteOptions(prev => ({
                          ...prev,
                          delete_after_24h: e.target.checked,
                          delete_after_viewing: e.target.checked ? false : prev.delete_after_viewing
                        }))}
                      />
                      Delete after 24 hours
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={deleteOptions.delete_after_viewing}
                        onChange={(e) => setDeleteOptions(prev => ({
                          ...prev,
                          delete_after_viewing: e.target.checked,
                          delete_after_24h: e.target.checked ? false : prev.delete_after_24h
                        }))}
                      />
                      Delete after viewing
                    </label>
                  </div>

                  {/* Audio Recording Preview */}
                  {audioBlob && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <MicrophoneIcon style={{ width: '20px', height: '20px', color: 'var(--primary-color)' }} />
                      <span style={{ flex: 1, fontSize: '0.875rem' }}>Voice message ready</span>
                      <button
                        onClick={cancelRecording}
                        style={{
                          padding: '0.25rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <XMarkIcon style={{ width: '20px', height: '20px' }} />
                      </button>
                    </div>
                  )}

                  {/* Input Form */}
                  <form onSubmit={sendMessage} style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center'
                  }}>
                    {/* Image Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <PhotoIcon style={{ width: '20px', height: '20px' }} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />

                    {/* Voice Recording Button */}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isSending}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: isRecording ? '#ef4444' : 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: isRecording ? 'white' : 'var(--text-primary)',
                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                      }}
                    >
                      <MicrophoneIcon style={{ width: '20px', height: '20px' }} />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isSending || isRecording}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !audioBlob) || isSending}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: (!newMessage.trim() && !audioBlob) || isSending ? 0.5 : 1
                      }}
                    >
                      <PaperAirplaneIcon style={{ width: '20px', height: '20px' }} />
                      Send
                    </button>
                  </form>
                </div>
              </div>

              {/* Shared Media Sidebar */}
              {showMediaGallery && (
                <div style={{
                  width: '300px',
                  borderLeft: '1px solid var(--border-color)',
                  overflowY: 'auto',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Shared Media (24h)</h3>
                    <button
                      onClick={() => setShowMediaGallery(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <XMarkIcon style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem'
                  }}>
                    {sharedMedia.filter(m => m.message_type === 'image').map((media) => (
                      <div key={media.id} style={{ position: 'relative' }}>
                        <img
                          src={media.media_url}
                          alt="Shared"
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(media.media_url, '_blank')}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          fontSize: '0.7rem',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {formatTime(media.created_at)}
                        </div>
                      </div>
                    ))}
                    {sharedMedia.filter(m => m.message_type === 'audio').map((media) => (
                      <div
                        key={media.id}
                        style={{
                          padding: '1rem',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <MicrophoneIcon style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
                        <audio controls style={{ width: '100%', height: '30px' }}>
                          <source src={media.media_url} type="audio/webm" />
                        </audio>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {formatTime(media.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {sharedMedia.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      padding: '2rem 0'
                    }}>
                      No shared media in the last 24 hours
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Toggle Media Gallery Button */}
            <button
              onClick={() => {
                setShowMediaGallery(!showMediaGallery);
                if (!showMediaGallery && selectedConversation) {
                  fetchSharedMedia(selectedConversation.user.id);
                }
              }}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '110px',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <DocumentIcon style={{ width: '16px', height: '16px' }} />
              {showMediaGallery ? 'Hide' : 'Show'} Media
            </button>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                Select a conversation
              </div>
              <div>Choose someone from the top bar to start messaging</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

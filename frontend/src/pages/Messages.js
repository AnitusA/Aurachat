import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const Messages = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/messages/conversations');
      const convos = response.data.conversations || [];
      setConversations(convos);

      // If no conversations, fetch followers to suggest starting conversations
      if (convos.length === 0) {
        await fetchFollowers();
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await api.get(`/messages/${userId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchFollowers = async () => {
    setIsLoadingFollowers(true);
    try {
      const response = await api.get('/users/followers');
      setFollowers(response.data.followers || []);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const startConversation = async (follower) => {
    try {
      // Send an initial message to start the conversation
      const response = await api.post('/messages', {
        receiver_id: follower.id,
        content: "Hi! Let's start a conversation."
      });

      // Refresh conversations to show the new one
      await fetchConversations();

      // Select the new conversation
      const newConversation = {
        user: follower,
        latest_message: response.data.message
      };
      setSelectedConversation(newConversation);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const response = await api.post('/messages', {
        receiver_id: selectedConversation.user.id,
        content: newMessage.trim()
      });

      setMessages([...messages, response.data.message_data]);
      setNewMessage('');

      // Update conversation list
      fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
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
    <div className="messages-page" style={{
      display: 'flex',
      height: 'calc(100vh - 2rem)',
      gap: '1rem',
      padding: '1rem 0'
    }}>
      {/* Conversations Sidebar */}
      <div style={{
        width: '300px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border-color)',
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
          Messages
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto'
        }}>
          {conversations.length === 0 ? (
            <div>
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.9rem'
              }}>
                Start a conversation with your followers
              </div>
              {isLoadingFollowers ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  Loading followers...
                </div>
              ) : followers.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  No followers yet. Follow some users to start messaging!
                </div>
              ) : (
                followers.map((follower) => (
                  <div
                    key={follower.id}
                    onClick={() => startConversation(follower)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      transition: 'background-color var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      backgroundImage: follower.profile_pic && follower.profile_pic !== 'default.jpg'
                        ? `url(${follower.profile_pic})`
                        : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}>
                      {(!follower.profile_pic || follower.profile_pic === 'default.jpg')
                        && follower.username?.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '0.25rem'
                      }}>
                        {follower.username}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                      }}>
                        Click to start messaging
                      </div>
                    </div>

                    <div style={{
                      color: 'var(--primary-color)',
                      fontSize: '1.2rem'
                    }}>
                      💬
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.user.id}
                onClick={() => setSelectedConversation(conversation)}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  backgroundColor: selectedConversation?.user.id === conversation.user.id
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                  transition: 'background-color var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    backgroundImage: conversation.user.profile_pic && conversation.user.profile_pic !== 'default.jpg'
                      ? `url(${conversation.user.profile_pic})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {(!conversation.user.profile_pic || conversation.user.profile_pic === 'default.jpg')
                      && conversation.user.username?.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {conversation.user.username}
                    </div>
                    {conversation.latest_message && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {conversation.latest_message.content}
                      </div>
                    )}
                  </div>

                  {conversation.unread_count > 0 && (
                    <div style={{
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {conversation.unread_count}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                backgroundImage: selectedConversation.user.profile_pic && selectedConversation.user.profile_pic !== 'default.jpg'
                  ? `url(${selectedConversation.user.profile_pic})`
                  : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                {(!selectedConversation.user.profile_pic || selectedConversation.user.profile_pic === 'default.jpg')
                  && selectedConversation.user.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {selectedConversation.user.username}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
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
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
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
                    <div style={{ marginBottom: '0.25rem' }}>
                      {message.content}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      opacity: 0.7
                    }}>
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} style={{
              padding: '1rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  opacity: !newMessage.trim() || isSending ? 0.5 : 1
                }}
              >
                {isSending ? '...' : 'Send'}
              </button>
            </form>
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
              <div>Choose someone from the sidebar to start messaging</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
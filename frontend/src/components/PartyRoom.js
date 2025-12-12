import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

const PartyRoom = ({ party, onLeave, onKickUser, onDeleteParty, user }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reactions, setReactions] = useState([]);
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' }); // type: 'success' or 'error'
  const [activeTab, setActiveTab] = useState('chat'); // 'members' | 'chat'
  const playerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const lastSyncTimeRef = useRef(0);
  
  const isAdmin = party.admin_id === user.id;

  // Limit message history to prevent memory issues
  const MAX_MESSAGES = 100;
  const displayedMessages = useMemo(() => {
    return messages.slice(-MAX_MESSAGES);
  }, [messages]);

  // Message item component (memoized) — separate component avoids useMemo pitfalls
  const MessageItem = React.memo(({ message, isOwnMessage }) => {
    return (
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          gap: '0.75rem',
          alignItems: 'flex-start',
          width: '100%'
        }}
      >
        {/* Profile Picture */}
        {!isOwnMessage && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: message.profile_pic && message.profile_pic !== 'default.jpg'
                ? `url(${message.profile_pic}) center/cover`
                : 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.75rem',
              border: '2px solid var(--bg-secondary)'
            }}
          >
            {!(message.profile_pic && message.profile_pic !== 'default.jpg') &&
              (message.username?.charAt(0).toUpperCase() || 'U')}
          </div>
        )}

        {/* Message Bubble */}
        <div
          style={{
            maxWidth: '70%',
            padding: '0.875rem 1rem',
            backgroundColor: isOwnMessage 
              ? 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)'
              : 'var(--bg-secondary)',
            backgroundImage: isOwnMessage 
              ? 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)'
              : 'none',
            borderRadius: isOwnMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            color: isOwnMessage ? 'white' : 'var(--text-primary)',
            wordWrap: 'break-word',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: isOwnMessage ? 'none' : '1px solid var(--border-color)',
            transition: 'transform 0.2s ease',
            position: 'relative'
          }}
          role="button"
          tabIndex={0}
        >
          {/* Username for other people's messages */}
          {!isOwnMessage && (
            <div style={{
              fontSize: '0.8rem',
              fontWeight: '700',
              marginBottom: '0.35rem',
              color: 'var(--primary-color)',
              letterSpacing: '0.3px'
            }}>
              {message.username}
            </div>
          )}

          {/* Message Content */}
          <div style={{ 
            fontSize: '0.95rem', 
            lineHeight: '1.5',
            marginBottom: '0.25rem'
          }}>
            {message.message}
          </div>

          {/* Timestamp */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <div style={{
              fontSize: '0.7rem',
              opacity: isOwnMessage ? 0.8 : 0.6,
              fontWeight: '500'
            }}>
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : ''}
            </div>
            {isOwnMessage && (
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>✓✓</span>
            )}
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // shallow compare by message id and text to avoid unnecessary re-renders
    const prevId = prevProps.message?.id || prevProps.message?.timestamp;
    const nextId = nextProps.message?.id || nextProps.message?.timestamp;
    return prevId === nextId && prevProps.isOwnMessage === nextProps.isOwnMessage;
  });

  // Optimized auto-scroll with smooth behavior
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  // Auto-scroll only when user is near bottom
  const shouldAutoScroll = useRef(true);
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      shouldAutoScroll.current = isNearBottom;
    }
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollToBottom();
    }
  }, [displayedMessages, scrollToBottom]);

  // Fetch join requests if admin
  useEffect(() => {
    if (isAdmin) {
      fetchJoinRequests();
    }
  }, [isAdmin, party.id]);

  const fetchJoinRequests = async () => {
    try {
      const response = await api.get(`/parties/${party.id}/requests`);
      setJoinRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    }
  };

  const handleJoinRequest = async (requestId, action) => {
    try {
      await api.post(`/parties/${party.id}/requests/${requestId}`, { action });
      // Refresh join requests
      fetchJoinRequests();
      setNotification({ message: `Request ${action}d successfully!`, type: 'success' });
      setTimeout(() => setNotification({ message: '', type: '' }), 3000);
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      setNotification({ message: `Failed to ${action} request`, type: 'error' });
      setTimeout(() => setNotification({ message: '', type: '' }), 3000);
    }
  };

  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    try {
      const response = await api.get('/following');
      setFollowingList(response.data.following || []);
    } catch (error) {
      console.error('Failed to fetch following:', error);
      setFollowingList([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const addMemberToParty = async (userId) => {
    try {
      await api.post(`/parties/${party.id}/add-member`, { user_id: userId });
      setShowAddMemberModal(false);
      setNotification({ message: 'Member added successfully!', type: 'success' });
      setTimeout(() => setNotification({ message: '', type: '' }), 3000);
      // Party members will be updated via socket event
    } catch (error) {
      console.error('Failed to add member:', error);
      setNotification({ message: error.response?.data?.error || 'Failed to add member', type: 'error' });
      setTimeout(() => setNotification({ message: '', type: '' }), 3000);
    }
  };
  
  
  // Helper to safely get player methods
  const getPlayer = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      return playerRef.current;
    }
    return null;
  }, []);

  // Load chat history when joining
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await api.get(`/parties/${party.id}/messages`);
        if (response.data.messages) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };
    loadChatHistory();
  }, [party.id]);

  useEffect(() => {
    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createPlayer = () => {
    if (!party.youtube_url) return;

    const videoId = extractVideoId(party.youtube_url);
    if (!videoId) return;

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: isAdmin ? 1 : 0, // Only admin can control
        disablekb: isAdmin ? 0 : 1, // Disable keyboard for non-admin
        fs: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange
      }
    });
  };

  const extractVideoId = (url) => {
    // Support standard YouTube URLs, short URLs, embeds, and Shorts
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,  // YouTube Shorts
      /youtu\.be\/shorts\/([a-zA-Z0-9_-]{11})/      // Short URL Shorts
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const onPlayerReady = (event) => {
    // Player is ready - mark it
    setIsPlayerReady(true);
    
    if (isAdmin) {
      // Admin starts playback and begins periodic sync
      startPeriodicSync();
    } else {
      // Non-admin requests initial sync from admin
      if (socket) {
        socket.emit('request_sync', { party_id: party.id });
      }
    }
  };

  const onPlayerStateChange = (event) => {
    const player = getPlayer();
    if (!player) return;
    
    const newState = {
      isPlaying: event.data === window.YT.PlayerState.PLAYING,
      currentTime: player.getCurrentTime(),
      duration: player.getDuration()
    };
    setVideoState(newState);

    // Only admin broadcasts state changes
    if (socket && isAdmin) {
      socket.emit('video_state_change', {
        party_id: party.id,
        state: event.data,
        current_time: newState.currentTime,
        is_playing: newState.isPlaying
      });
    }
  };

  // Admin periodically syncs position every 3 seconds
  const startPeriodicSync = useCallback(() => {
    if (!isAdmin) return;
    
    // Clear any existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    syncIntervalRef.current = setInterval(() => {
      const player = getPlayer();
      if (player && socket) {
        const currentTime = player.getCurrentTime();
        const playerState = player.getPlayerState();
        const isPlaying = playerState === window.YT.PlayerState.PLAYING;
        
        socket.emit('admin_sync', {
          party_id: party.id,
          current_time: currentTime,
          is_playing: isPlaying
        });
      }
    }, 3000); // Sync every 3 seconds
  }, [isAdmin, socket, party.id, getPlayer]);

  // Cleanup periodic sync on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Handle sync from admin (for non-admin users)
  const handleVideoSync = useCallback((data) => {
    if (isAdmin) return; // Admin doesn't need to sync to themselves
    
    const player = getPlayer();
    if (!player) return;
    
    const { current_time, is_playing } = data;
    const playerCurrentTime = player.getCurrentTime();
    const timeDiff = Math.abs(playerCurrentTime - current_time);
    
    // Only seek if difference is more than 2 seconds (to avoid constant jumping)
    if (timeDiff > 2) {
      setIsSyncing(true);
      player.seekTo(current_time, true);
      setTimeout(() => setIsSyncing(false), 500);
    }
    
    // Sync play/pause state
    const playerState = player.getPlayerState();
    const isCurrentlyPlaying = playerState === window.YT.PlayerState.PLAYING;
    
    if (is_playing && !isCurrentlyPlaying) {
      player.playVideo();
    } else if (!is_playing && isCurrentlyPlaying) {
      player.pauseVideo();
    }
  }, [isAdmin, getPlayer]);

  // Request manual sync (for non-admin)
  const requestSync = () => {
    if (socket && !isAdmin) {
      socket.emit('request_sync', { party_id: party.id });
    }
  };

  // Socket event listeners for video sync
  useEffect(() => {
    if (!socket) return;

    // Join party room
    socket.emit('join_party', { party_id: party.id, user_id: user.id });

    // Listen for video sync events
    socket.on('video_sync', handleVideoSync);
    socket.on('admin_sync', handleVideoSync);

    // Listen for sync requests (admin only)
    socket.on('sync_requested', (data) => {
      const player = getPlayer();
      if (isAdmin && player) {
        const currentTime = player.getCurrentTime();
        const playerState = player.getPlayerState();
        const isPlaying = playerState === window.YT.PlayerState.PLAYING;
        
        socket.emit('admin_sync', {
          party_id: party.id,
          current_time: currentTime,
          is_playing: isPlaying
        });
      }
    });

    // Listen for party messages
    socket.on('party_message', (data) => {
      if (data.party_id === party.id) {
        setMessages(prev => {
          // Check if this message already exists (prevent duplicates)
          const exists = prev.some(msg => 
            msg.id === data.id || 
            (msg.user_id === data.user_id && 
             msg.message === data.message && 
             Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 2000)
          );
          
          if (exists) {
            return prev; // Don't add duplicate
          }
          
          // Add new message
          const newMessage = {
            id: data.id,
            party_id: data.party_id,
            message: data.message,
            user_id: data.user_id,
            username: data.username,
            profile_pic: data.profile_pic,
            timestamp: data.timestamp
          };
          
          const updatedMessages = [...prev, newMessage];
          return updatedMessages.slice(-MAX_MESSAGES);
        });
      }
    });

    // Listen for reactions
    socket.on('party_reaction', (data) => {
      if (data.party_id === party.id && data.user_id !== user.id) {
        const reaction = {
          id: Date.now(),
          emoji: data.emoji,
          username: data.username,
          timestamp: Date.now()
        };
        setReactions(prev => [...prev, reaction]);
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== reaction.id));
        }, 3000);
      }
    });

    return () => {
      socket.emit('leave_party', { party_id: party.id, user_id: user.id });
      socket.off('video_sync', handleVideoSync);
      socket.off('admin_sync', handleVideoSync);
      socket.off('sync_requested');
      socket.off('party_message');
      socket.off('party_reaction');
    };
  }, [socket, party.id, user.id, handleVideoSync, isAdmin]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send message via API - it will broadcast via socket
      await api.post(`/parties/${party.id}/messages`, {
        message: messageContent
      });
      
      // Message will be added via socket event, no need to add locally
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message if failed
      setNewMessage(messageContent);
    }
  };

  const sendReaction = (emoji) => {
    if (socket) {
      socket.emit('party_reaction', {
        party_id: party.id,
        emoji: emoji,
        user_id: user.id,
        username: user.username
      });
    }

    // Show reaction locally
    const reaction = {
      id: Date.now(),
      emoji,
      username: user.username,
      timestamp: Date.now()
    };
    setReactions(prev => [...prev, reaction]);

    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };

  const handleKickUser = (userId) => {
    if (party.admin_id === user.id) {
      onKickUser(userId);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* Notification Toast */}
      {notification.message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: notification.type === 'success' ? '#28a745' : '#dc3545',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 10000,
          animation: 'slideInRight 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500',
          fontSize: '0.95rem',
          maxWidth: '400px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>
            {notification.type === 'success' ? '✅' : '❌'}
          </span>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
            {party.name}
            {isAdmin && (
              <span style={{ 
                marginLeft: '0.5rem', 
                fontSize: '0.8rem', 
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px'
              }}>
                👑 Admin
              </span>
            )}
          </h2>
          <p style={{
            margin: '0.25rem 0 0 0',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>
            {party.members.length} watching • {party.type === 'private' ? '🔒 Private' : '🌍 Public'}
            {!isAdmin && (
              <span style={{ marginLeft: '0.5rem' }}>
                • {isSyncing ? '🔄 Syncing...' : '✅ Synced'}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isAdmin && (
            <button
              onClick={requestSync}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
              title="Sync your video with admin's position"
            >
              🔄 Sync Now
            </button>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={onDeleteParty}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              title="Delete this party"
            >
              🗑️ Delete Party
            </button>
          )}
          <button
            onClick={onLeave}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            Leave Party
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Video Section */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: 'black'
        }}>
          <div
            id="youtube-player"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '400px'
            }}
          />

          {/* Reactions Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {reactions.map(reaction => (
              <div
                key={reaction.id}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * 80 + 10}%`,
                  fontSize: '2rem',
                  animation: 'floatUp 3s ease-out forwards',
                  opacity: 1
                }}
              >
                {reaction.emoji}
              </div>
            ))}
          </div>

          {/* Video Controls (only for admin) */}
          {isAdmin ? (
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--border-radius)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontSize: '0.85rem', marginRight: '0.5rem' }}>
                👑 Admin Controls:
              </span>
              <button
                onClick={() => getPlayer()?.playVideo()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1.1rem'
                }}
              >
                ▶️ Play
              </button>
              <button
                onClick={() => getPlayer()?.pauseVideo()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1.1rem'
                }}
              >
                ⏸️ Pause
              </button>
              <button
                onClick={() => {
                  const player = getPlayer();
                  if (player) player.seekTo(player.getCurrentTime() - 10, true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1.1rem'
                }}
              >
                ⏪ -10s
              </button>
              <button
                onClick={() => {
                  const player = getPlayer();
                  if (player) player.seekTo(player.getCurrentTime() + 10, true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1.1rem'
                }}
              >
                ⏩ +10s
              </button>
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius)',
              color: 'white',
              fontSize: '0.85rem'
            }}>
              {isSyncing ? '🔄 Syncing with admin...' : '📺 Video controlled by admin'}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{
          width: '350px',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          {/* Tab Buttons */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)'
          }}>
            <button
              onClick={() => setActiveTab('members')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                borderBottom: activeTab === 'members' ? '3px solid var(--primary-color)' : '3px solid transparent',
                backgroundColor: activeTab === 'members' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'members' ? 'var(--primary-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'members' ? '600' : '500',
                fontSize: '0.95rem',
                transition: 'all var(--transition-fast)'
              }}
            >
              👥 Members
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                borderBottom: activeTab === 'chat' ? '3px solid var(--primary-color)' : '3px solid transparent',
                backgroundColor: activeTab === 'chat' ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--primary-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'chat' ? '600' : '500',
                fontSize: '0.95rem',
                transition: 'all var(--transition-fast)'
              }}
            >
              💬 Chat
            </button>
          </div>

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto'
            }}>
              {/* Members List */}
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  color: 'var(--text-primary)',
                  fontSize: '1.1rem'
                }}>
                  Members ({party.members.length})
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {party.members.map(member => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem',
                        backgroundColor: member.id === party.admin_id ? 'var(--accent-color)' : 'var(--bg-primary)',
                        borderRadius: 'var(--border-radius)',
                        color: member.id === party.admin_id ? 'white' : 'var(--text-primary)'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '600' }}>{member.username}</span>
                        {member.id === party.admin_id && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>👑 Admin</span>
                        )}
                      </div>
                      {party.admin_id === user.id && member.id !== user.id && (
                        <button
                          onClick={() => handleKickUser(member.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            opacity: 0.7
                          }}
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Controls - Join Requests & Add Members */}
              {isAdmin && (
                <>
                  {/* Join Requests */}
                  {joinRequests.length > 0 && (
                    <div style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)'
                    }}>
                      <h3 style={{
                        margin: '0 0 0.75rem 0',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}>
                        Join Requests ({joinRequests.length})
                      </h3>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '150px',
                        overflowY: 'auto'
                      }}>
                        {joinRequests.map(request => (
                          <div
                            key={request.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem',
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: 'var(--border-radius)',
                              fontSize: '0.9rem'
                            }}
                          >
                            <span style={{ fontWeight: '500' }}>{request.username}</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleJoinRequest(request.id, 'approve')}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  border: 'none',
                                  borderRadius: 'var(--border-radius)',
                                  backgroundColor: 'var(--success-color)',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                ✓ Accept
                              </button>
                              <button
                                onClick={() => handleJoinRequest(request.id, 'reject')}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  border: 'none',
                                  borderRadius: 'var(--border-radius)',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Member Button */}
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)'
                  }}>
                    <button
                      onClick={() => {
                        setShowAddMemberModal(true);
                        fetchFollowing();
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.95rem'
                      }}
                    >
                      ➕ Add Member
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              height: '100%'
            }}>
              {/* Messages */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '1rem',
                  scrollBehavior: 'smooth',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                {displayedMessages.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}>
                    💬 No messages yet. Start the conversation!
                  </div>
                ) : (
                  <>
                    {displayedMessages.map((message) => (
                      <MessageItem
                        key={message.id || message.tempId || message.timestamp || (`msg_${message.user_id}_${message.timestamp}`)}
                        message={message}
                        isOwnMessage={message.user_id === user.id}
                      />
                    ))}
                    {messages.length > MAX_MESSAGES && (
                      <div style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontStyle: 'italic'
                      }}>
                        Showing last {MAX_MESSAGES} messages
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{
                padding: '1rem',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
              }}>
                <form onSubmit={sendMessage} style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
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
                      borderRadius: '25px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    style={{
                      padding: '0.75rem 1.25rem',
                      border: 'none',
                      borderRadius: '25px',
                      backgroundColor: newMessage.trim() ? 'var(--primary-color)' : 'var(--border-color)',
                      color: 'white',
                      cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span>📤</span>
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '70vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: '0 0 1.5rem 0',
              color: 'var(--text-primary)',
              fontSize: '1.5rem'
            }}>
              Add Member to Party
            </h2>

            {loadingFollowing ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                Loading your friends...
              </div>
            ) : followingList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                You're not following anyone yet. Follow people to add them to your party!
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {followingList.map(person => {
                  const isAlreadyMember = party.members.some(m => m.id === person.id);
                  return (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: person.profile_pic && person.profile_pic !== 'default.jpg'
                              ? `url(${person.profile_pic}) center/cover`
                              : 'linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '1rem'
                          }}
                        >
                          {!(person.profile_pic && person.profile_pic !== 'default.jpg') &&
                            person.username?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{
                          fontWeight: '500',
                          color: 'var(--text-primary)'
                        }}>
                          {person.username}
                        </span>
                      </div>
                      {isAlreadyMember ? (
                        <span style={{
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic'
                        }}>
                          Already a member
                        </span>
                      ) : (
                        <button
                          onClick={() => addMemberToParty(person.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: 'var(--border-radius)',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                          }}
                        >
                          ➕ Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowAddMemberModal(false)}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PartyRoom;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import PartyRoom from '../components/PartyRoom';
import api from '../services/api';

const Parties = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { socket, isConnected } = useSocket();
  const [parties, setParties] = useState([]);
  const [myParties, setMyParties] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [currentParty, setCurrentParty] = useState(null);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState('private');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoSearch, setShowVideoSearch] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videoSearchResults, setVideoSearchResults] = useState([]);
  const [isSearchingVideos, setIsSearchingVideos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    fetchParties();
    fetchMyParties();
  }, []);

  useEffect(() => {
    if (socket && isConnected) {
      // Party-related socket events
      socket.on('party_created', handlePartyCreated);
      socket.on('party_joined', handlePartyJoined);
      socket.on('party_left', handlePartyLeft);
      socket.on('user_kicked', handleUserKicked);
      socket.on('party_deleted', handlePartyDeleted);
      socket.on('video_sync', handleVideoSync);
      socket.on('party_message', handlePartyMessage);
      socket.on('party_reaction', handlePartyReaction);

      return () => {
        socket.off('party_created', handlePartyCreated);
        socket.off('party_joined', handlePartyJoined);
        socket.off('party_left', handlePartyLeft);
        socket.off('user_kicked', handleUserKicked);
        socket.off('party_deleted', handlePartyDeleted);
        socket.off('video_sync', handleVideoSync);
        socket.off('party_message', handlePartyMessage);
        socket.off('party_reaction', handlePartyReaction);
      };
    }
  }, [socket, isConnected]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const fetchParties = async () => {
    try {
      const response = await api.get('/parties');
      setParties(response.data.parties || []);
    } catch (error) {
      console.error('Failed to fetch parties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyParties = async () => {
    try {
      const response = await api.get('/parties/my');
      setMyParties(response.data.parties || []);
    } catch (error) {
      console.error('Failed to fetch my parties:', error);
    }
  };

  const deletePartyFromList = async (partyId, e) => {
    e.stopPropagation(); // Prevent card click (joining party)
    const party = parties.find(p => p.id === partyId) || myParties.find(p => p.id === partyId);
    setPartyToDelete(party);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteParty = async () => {
    if (!partyToDelete) return;

    try {
      await api.delete(`/parties/${partyToDelete.id}`);
      // Remove from both lists
      setParties(prev => prev.filter(p => p.id !== partyToDelete.id));
      setMyParties(prev => prev.filter(p => p.id !== partyToDelete.id));
      setShowDeleteConfirm(false);
      setPartyToDelete(null);
      if (currentParty && currentParty.id === partyToDelete.id) {
        setCurrentParty(null);
      }
    } catch (error) {
      console.error('Failed to delete party:', error);
      setErrorMessage('Failed to delete party. Please try again.');
      setTimeout(() => setErrorMessage(null), 3000);
      setShowDeleteConfirm(false);
      setPartyToDelete(null);
    }
  };

  const handlePartyCreated = (data) => {
    setParties(prev => [...prev, data.party]);
    // If current user created this party, add to myParties
    if (data.party.admin_id === user.id) {
      setMyParties(prev => [...prev, data.party]);
    }
  };

  const handlePartyJoined = (data) => {
    if (currentParty && currentParty.id === data.party_id) {
      setCurrentParty(prev => ({
        ...prev,
        members: data.members
      }));
    }
  };

  const handlePartyLeft = (data) => {
    if (currentParty && currentParty.id === data.party_id) {
      setCurrentParty(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== data.user_id)
      }));
    }
  };

  const handleUserKicked = (data) => {
    if (data.user_id === user.id) {
      // User was kicked
      setCurrentParty(null);
      alert('You have been removed from the party.');
    } else if (currentParty && currentParty.id === data.party_id) {
      setCurrentParty(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== data.user_id)
      }));
    }
  };

  const handlePartyDeleted = (data) => {
    // Remove the deleted party from both lists
    setParties(prev => prev.filter(p => p.id !== data.party_id));
    setMyParties(prev => prev.filter(p => p.id !== data.party_id));
    
    // If user is in the deleted party, kick them out
    if (currentParty && currentParty.id === data.party_id) {
      setCurrentParty(null);
      alert('The party has been deleted by the admin.');
    }
  };

  const handleVideoSync = (data) => {
    // Handle video synchronization
    console.log('Video sync:', data);
  };

  const handlePartyMessage = (data) => {
    // Handle party chat messages
    console.log('Party message:', data);
  };

  const handlePartyReaction = (data) => {
    // Handle emoji reactions
    console.log('Party reaction:', data);
  };

  const createParty = async () => {
    if (!partyName.trim() || !selectedVideo) {
      alert('Please enter party name and select a video');
      return;
    }

    try {
      const response = await api.post('/parties', {
        name: partyName.trim(),
        type: partyType,
        youtube_url: selectedVideo.url
      });

      const newParty = response.data.party;
      
      // Add to both lists immediately
      setParties(prev => [...prev, newParty]);
      setMyParties(prev => [...prev, newParty]);
      
      setCurrentParty(newParty);
      setShowCreateParty(false);
      setPartyName('');
      setSelectedVideo(null);
    } catch (error) {
      console.error('Failed to create party:', error);
      alert('Failed to create party. Please try again.');
    }
  };

  const searchVideos = async (query) => {
    const searchQuery = query || videoSearchQuery;
    if (!searchQuery.trim()) {
      setVideoSearchResults([]);
      return;
    }

    setIsSearchingVideos(true);
    try {
      const response = await api.get('/youtube/videos/search', {
        params: {
          q: searchQuery.trim(),
          max_results: 20
        }
      });

      setVideoSearchResults(response.data.videos || []);
    } catch (error) {
      console.error('Failed to search videos:', error);
      setVideoSearchResults([]);
    } finally {
      setIsSearchingVideos(false);
    }
  };

  // Debounced search - triggers as user types
  const handleSearchInputChange = useCallback((e) => {
    const value = e.target.value;
    setVideoSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchVideos(value);
      }, 400); // 400ms debounce
    } else {
      setVideoSearchResults([]);
    }
  }, []);

  const selectVideo = (video) => {
    setSelectedVideo(video);
    setShowVideoSearch(false);
    setVideoSearchQuery('');
    setVideoSearchResults([]);
  };

  const clearSelectedVideo = () => {
    setSelectedVideo(null);
  };

  const joinParty = async (partyId) => {
    try {
      // Find the party from our current lists
      const allParties = [...parties, ...myParties];
      const party = allParties.find(p => p.id === partyId);

      if (!party) {
        setErrorMessage('Party not found');
        setTimeout(() => setErrorMessage(null), 5000);
        return;
      }

      // Check if user is already a member
      const isMember = party.members && party.members.some(member => member.id === user.id);

      if (isMember) {
        // User is already a member, just enter the party
        setCurrentParty(party);
      } else {
        // User is not a member, try to join
        const response = await api.post(`/parties/${partyId}/join`);
        setCurrentParty(response.data.party);
      }
    } catch (error) {
      console.error('Failed to join party:', error);
      if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage('Failed to join party. Please try again.');
      }
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const leaveParty = async () => {
    if (!currentParty) return;

    try {
      await api.post(`/parties/${currentParty.id}/leave`);
      setCurrentParty(null);
    } catch (error) {
      console.error('Failed to leave party:', error);
    }
  };

  const kickUser = async (userId) => {
    if (!currentParty || currentParty.admin_id !== user.id) return;

    try {
      await api.post(`/parties/${currentParty.id}/kick`, {
        user_id: userId
      });
    } catch (error) {
      console.error('Failed to kick user:', error);
    }
  };

  const deleteParty = async () => {
    if (!currentParty || currentParty.admin_id !== user.id) return;

    setPartyToDelete(currentParty);
    setShowDeleteConfirm(true);
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

  if (currentParty) {
    return (
      <PartyRoom
        party={currentParty}
        onLeave={leaveParty}
        onKickUser={kickUser}
        onDeleteParty={deleteParty}
        user={user}
      />
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Error Notification */}
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          animation: 'slideDown 0.3s ease-out',
          maxWidth: '500px',
          textAlign: 'center',
          fontWeight: '500',
          fontSize: '1rem'
        }}>
          🚫 {errorMessage}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          color: 'var(--text-primary)',
          margin: 0
        }}>
          Parties
        </h1>
        <button
          onClick={() => setShowCreateParty(true)}
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Create Party
        </button>
      </div>

      {showCreateParty && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '2rem',
            borderRadius: 'var(--border-radius)',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: 'var(--text-primary)', marginTop: 0 }}>
              Create New Party
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Party Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem'
                }}
              />

              <select
                value={partyType}
                onChange={(e) => setPartyType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem'
                }}
              >
                <option value="private">Private Party</option>
                <option value="public">Public Party</option>
              </select>

              <div style={{ marginBottom: '1rem' }}>
                <button
                  onClick={() => setShowVideoSearch(true)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {selectedVideo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img
                        src={selectedVideo.thumbnail}
                        alt={selectedVideo.title}
                        style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{selectedVideo.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedVideo.channel_title}</div>
                      </div>
                    </div>
                  ) : (
                    'Select YouTube Video'
                  )}
                </button>
                {selectedVideo && (
                  <button
                    onClick={clearSelectedVideo}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      border: 'none',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--error-color)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCreateParty(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createParty}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--accent-color)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Create Party
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoSearch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '2rem',
            borderRadius: 'var(--border-radius)',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
                Search YouTube Videos
              </h2>
              <button
                onClick={() => setShowVideoSearch(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Start typing to search videos..."
                    value={videoSearchQuery}
                    onChange={handleSearchInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && searchVideos()}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  {isSearchingVideos && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}>
                      ⏳
                    </div>
                  )}
                </div>
                <button
                  onClick={() => searchVideos()}
                  disabled={isSearchingVideos || !videoSearchQuery.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    cursor: (isSearchingVideos || !videoSearchQuery.trim()) ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: (isSearchingVideos || !videoSearchQuery.trim()) ? 0.6 : 1
                  }}
                >
                  {isSearchingVideos ? '...' : 'Search'}
                </button>
              </div>
              {videoSearchQuery.length > 0 && videoSearchQuery.length < 2 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>
                  Type at least 2 characters to see recommendations
                </p>
              )}
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '1rem'
            }}>
              {videoSearchResults.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '1rem'
                }}>
                  {videoSearchResults.map(video => (
                    <div
                      key={video.id}
                      onClick={() => selectVideo(video)}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'transform var(--transition-fast)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: 'var(--border-radius)'
                        }}
                      />
                      <div>
                        <h4 style={{
                          color: 'var(--text-primary)',
                          margin: '0 0 0.25rem 0',
                          fontSize: '0.9rem',
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {video.title}
                        </h4>
                        <p style={{
                          color: 'var(--text-secondary)',
                          margin: 0,
                          fontSize: '0.8rem'
                        }}>
                          {video.channel_title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  padding: '2rem'
                }}>
                  {isSearchingVideos ? 'Searching videos...' : 'No videos found. Try a different search term.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs for All Parties / My Parties */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--border-color)',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
            backgroundColor: activeTab === 'all' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'all' ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'all' ? '600' : '400',
            fontSize: '1rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          🎉 All Parties ({parties.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
            backgroundColor: activeTab === 'my' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'my' ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: activeTab === 'my' ? '600' : '400',
            fontSize: '1rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          👤 My Parties ({myParties.length})
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {(activeTab === 'all' ? parties : myParties).map(party => (
          <div
            key={party.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'transform var(--transition-fast)',
              position: 'relative'
            }}
            onClick={() => joinParty(party.id)}
          >
            {/* Delete button for admin's own parties */}
            {party.admin_id === user.id && (
              <button
                onClick={(e) => deletePartyFromList(party.id, e)}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  padding: '0.4rem 0.6rem',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  opacity: 0.8,
                  transition: 'opacity var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.8}
              >
                🗑️ Delete
              </button>
            )}
            <h3 style={{
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0',
              paddingRight: party.admin_id === user.id ? '70px' : '0'
            }}>
              {party.name}
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              margin: '0 0 0.5rem 0',
              fontSize: '0.9rem'
            }}>
              {party.type === 'private' ? (
                <span style={{ color: 'var(--warning-color)', fontWeight: '500' }}>
                  🔒 Private Party{party.admin_id !== user.id ? ' (Admin approval required)' : ''}
                </span>
              ) : (
                <span>🌍 Public Party</span>
              )} • {party.members_count} watching
            </p>
            <p style={{
              color: 'var(--text-secondary)',
              margin: 0,
              fontSize: '0.8rem'
            }}>
              Started by {party.admin_username}
              {party.admin_id === user.id && <span style={{ color: 'var(--primary-color)', fontWeight: '500' }}> (You)</span>}
            </p>
          </div>
        ))}

        {(activeTab === 'all' ? parties : myParties).length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--text-secondary)'
          }}>
            <p>{activeTab === 'all' ? 'No active parties. Create one to get started!' : 'You haven\'t created any parties yet. Create one!'}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            zIndex: 10000
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '2rem',
              maxWidth: '450px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: '1.8rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              ⚠️
            </div>
            <h2 style={{
              margin: '0 0 1rem 0',
              color: 'var(--text-primary)',
              fontSize: '1.5rem',
              textAlign: 'center'
            }}>
              Delete Party?
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              Are you sure you want to delete "<strong>{partyToDelete?.name}</strong>"? This action cannot be undone and all members will be removed.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '0.75rem 2rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteParty}
                style={{
                  padding: '0.75rem 2rem',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}
              >
                Delete Party
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Parties;
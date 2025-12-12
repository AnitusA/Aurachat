import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

const Search = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { sendMessage } = useSocket();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const startConversation = async (targetUser) => {
    if (!user) {
      alert('Please log in to send messages.');
      navigate('/login');
      return;
    }

    try {
      // Send an initial message to start the conversation via socket
      sendMessage(targetUser.id, `Hi ${targetUser.username}! I found you through search.`);

      // Navigate to messages page
      navigate('/messages');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/login');
      } else {
        alert('Failed to start conversation. Please try again.');
      }
    }
  };

  const viewProfile = (username) => {
    navigate(`/profile/${username}`);
  };

  return (
    <div className="search-page" style={{
      minHeight: 'calc(100vh - var(--navbar-height))',
      padding: '2rem 0',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Search Header */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ padding: '2rem' }}>
            <h2 style={{
              marginBottom: '1.5rem',
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}>
              🔍 Find People
            </h2>

            <form onSubmit={handleSearch}>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1.1rem',
                  opacity: (!searchQuery.trim() || isSearching) ? 0.5 : 1
                }}
              >
                {isSearching ? '🔍 Searching...' : '🔍 Search'}
              </button>
            </form>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="card">
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{
                marginBottom: '1rem',
                color: 'var(--text-primary)',
                fontSize: '1.2rem'
              }}>
                Search Results
              </h3>

              {isSearching ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--text-secondary)'
                }}>
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--text-secondary)'
                }}>
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                <div>
                  {searchResults.map((resultUser) => (
                    <div
                      key={resultUser.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--border-radius)',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flex: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => viewProfile(resultUser.username)}
                      >
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.2rem',
                          backgroundImage: resultUser.profile_pic && resultUser.profile_pic !== 'default.jpg'
                            ? `url(${resultUser.profile_pic})`
                            : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}>
                          {(!resultUser.profile_pic || resultUser.profile_pic === 'default.jpg')
                            && resultUser.username?.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            marginBottom: '0.25rem'
                          }}>
                            @{resultUser.username}
                          </div>
                          {resultUser.bio && (
                            <div style={{
                              fontSize: '0.875rem',
                              color: 'var(--text-secondary)',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {resultUser.bio}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => viewProfile(resultUser.username)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem'
                          }}
                        >
                          👤 Profile
                        </button>

                        {resultUser.id !== user?.id && user && (
                          <button
                            onClick={() => startConversation(resultUser)}
                            className="btn btn-primary"
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem'
                            }}
                          >
                            💬 Message
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tips */}
        {!hasSearched && (
          <div className="card">
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{
                marginBottom: '1rem',
                color: 'var(--text-primary)'
              }}>
                💡 Search Tips
              </h3>
              <ul style={{
                color: 'var(--text-secondary)',
                textAlign: 'left',
                maxWidth: '400px',
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                <li>• Search by username (e.g., "john_doe")</li>
                <li>• Partial matches are supported</li>
                <li>• Click on profiles to view user details</li>
                <li>• Use the Message button to start conversations</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
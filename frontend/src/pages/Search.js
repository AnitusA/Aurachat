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
      padding: '3rem 1rem',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Search Header */}
        <div className="card" style={{ 
          marginBottom: '2.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '2.5rem' }}>
            <h2 style={{
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              textAlign: 'center',
              fontSize: '2rem',
              fontWeight: '700'
            }}>
              🔍 Find People
            </h2>
            <p style={{
              marginBottom: '2rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              fontSize: '1rem'
            }}>
              Discover and connect with people on Aurachat
            </p>

            <form onSubmit={handleSearch} style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '50px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1.05rem',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-color)';
                    e.target.style.backgroundColor = 'var(--bg-card)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="btn btn-primary"
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  borderRadius: '50px',
                  whiteSpace: 'nowrap',
                  opacity: (!searchQuery.trim() || isSearching) ? 0.5 : 1,
                  cursor: (!searchQuery.trim() || isSearching) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSearching ? '🔍 Searching...' : '🔍 Search'}
              </button>
            </form>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="card" style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ padding: '2rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid var(--border-light)'
              }}>
                <h3 style={{
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Search Results
                </h3>
                {searchResults.length > 0 && (
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                  </span>
                )}
              </div>

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
                        padding: '1.25rem 1.5rem',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '12px',
                        marginBottom: '1rem',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.borderColor = 'var(--primary-color)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.25rem',
                          flex: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => viewProfile(resultUser.username)}
                      >
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.5rem',
                          flexShrink: 0,
                          backgroundImage: resultUser.profile_pic && resultUser.profile_pic !== 'default.jpg'
                            ? `url(${resultUser.profile_pic})`
                            : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '3px solid var(--bg-card)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          {(!resultUser.profile_pic || resultUser.profile_pic === 'default.jpg')
                            && resultUser.username?.charAt(0).toUpperCase()}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            marginBottom: '0.35rem',
                            fontSize: '1.1rem'
                          }}>
                            @{resultUser.username}
                          </div>
                          {resultUser.bio && (
                            <div style={{
                              fontSize: '0.95rem',
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.4'
                            }}>
                              {resultUser.bio}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            viewProfile(resultUser.username);
                          }}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.75rem 1.5rem',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            borderRadius: '25px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          👤 Profile
                        </button>

                        {resultUser.id !== user?.id && user && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startConversation(resultUser);
                            }}
                            className="btn btn-primary"
                            style={{
                              padding: '0.75rem 1.5rem',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              borderRadius: '25px',
                              whiteSpace: 'nowrap'
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
          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                background: 'var(--primary-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem'
              }}>
                💡
              </div>
              <h3 style={{
                marginBottom: '1.5rem',
                color: 'var(--text-primary)',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                Search Tips
              </h3>
              <ul style={{
                color: 'var(--text-secondary)',
                textAlign: 'left',
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: '2',
                fontSize: '1rem',
                listStyle: 'none',
                padding: 0
              }}>
                <li style={{ marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>🔍</span>
                  Search by username (e.g., "john_doe")
                </li>
                <li style={{ marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>✨</span>
                  Partial matches are supported
                </li>
                <li style={{ marginBottom: '0.75rem', paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>👤</span>
                  Click on profiles to view user details
                </li>
                <li style={{ paddingLeft: '1.5rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>💬</span>
                  Use the Message button to start conversations
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
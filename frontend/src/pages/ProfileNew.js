import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isOwnProfile = !username || username === currentUser?.username;
  const profileUsername = username || currentUser?.username;

  useEffect(() => {
    if (profileUsername) {
      fetchUserProfile();
      fetchUserPosts();
    }
  }, [profileUsername]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get(`/users/${profileUsername}`);
      setUser(response.data.user);
      setIsFollowing(response.data.is_following);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await api.get(`/users/${profileUsername}/posts`);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (isOwnProfile) return;

    setIsFollowLoading(true);
    try {
      const response = await api.post(`/users/${profileUsername}/follow`);
      setIsFollowing(response.data.is_following);
      
      // Update follower count
      setUser(prev => ({
        ...prev,
        followers_count: prev.followers_count + (response.data.is_following ? 1 : -1)
      }));
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatPostDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="profile-loading" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-not-found" style={{
        textAlign: 'center',
        padding: '3rem',
        minHeight: 'calc(100vh - var(--navbar-height))',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <h2 style={{ color: 'var(--text-primary)' }}>User not found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          The user you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className="profile-page" style={{
      minHeight: 'calc(100vh - var(--navbar-height))',
      padding: '2rem 1rem',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ 
        maxWidth: '900px', 
        margin: '0 auto',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        
        {/* Profile Header */}
        <div style={{
          marginBottom: '2rem'
        }}>
          {/* Top Section: Profile Picture + Info + Stats */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            marginBottom: '1.5rem',
            alignItems: 'flex-start'
          }}>
            {/* Profile Picture */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '3rem',
              fontWeight: 'bold',
              flexShrink: 0,
              backgroundImage: user.profile_pic && user.profile_pic !== 'default.jpg' 
                ? `url(${user.profile_pic})` 
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '4px solid var(--bg-card)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}>
              {(!user.profile_pic || user.profile_pic === 'default.jpg') 
                && user.username.charAt(0).toUpperCase()}
            </div>

            {/* Info and Stats Container */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {/* Username and Stats Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                {/* Username and Email */}
                <div>
                  <h1 style={{ 
                    margin: '0 0 0.25rem 0', 
                    color: 'var(--text-primary)',
                    fontSize: '1.75rem',
                    fontWeight: '600'
                  }}>
                    {user.username}
                  </h1>
                  
                  {/* Email */}
                  {user.email && (
                    <p style={{ 
                      margin: '0', 
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}>
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div style={{
                  display: 'flex',
                  gap: '2rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {posts.length}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      textTransform: 'lowercase'
                    }}>
                      post{posts.length !== 1 && 's'}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {user.followers_count || 0}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      textTransform: 'lowercase'
                    }}>
                      follow
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {user.following_count || 0}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      textTransform: 'lowercase'
                    }}>
                      following
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <p style={{
                  margin: '0.5rem 0 0 0',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  fontSize: '0.95rem',
                  borderBottom: '1px dotted var(--border-color)',
                  paddingBottom: '0.75rem'
                }}>
                  {user.bio}
                </p>
              )}

              {/* Follow/Edit Button */}
              <div style={{ marginTop: '0.5rem' }}>
                {!isOwnProfile ? (
                  <button
                    onClick={handleFollow}
                    disabled={isFollowLoading}
                    style={{
                      padding: '0.625rem 2rem',
                      backgroundColor: isFollowing ? 'var(--bg-secondary)' : 'var(--primary-color)',
                      color: isFollowing ? 'var(--text-primary)' : 'white',
                      border: isFollowing ? '1px solid var(--border-color)' : 'none',
                      borderRadius: '8px',
                      cursor: isFollowLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      opacity: isFollowLoading ? 0.7 : 1,
                      minWidth: '120px'
                    }}
                  >
                    {isFollowLoading 
                      ? 'Loading...' 
                      : isFollowing 
                        ? 'Unfollow' 
                        : 'Follow'
                    }
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/settings')}
                    style={{
                      padding: '0.625rem 2rem',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      minWidth: '120px'
                    }}
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div style={{
          borderTop: '2px solid var(--border-color)',
          paddingTop: '1.5rem'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontWeight: '600',
            textTransform: 'lowercase'
          }}>
            posts
          </h3>

          {posts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 1rem',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
              <p style={{ margin: 0 }}>
                {isOwnProfile 
                  ? "You haven't posted anything yet." 
                  : `${user.username} hasn't posted anything yet.`
                }
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem'
            }}>
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Post Image */}
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt="Post content"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      backgroundColor: 'var(--bg-secondary)'
                    }}>
                      <p style={{
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        lineHeight: '1.4',
                        textAlign: 'center',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        margin: 0
                      }}>
                        {post.content}
                      </p>
                    </div>
                  )}

                  {/* Overlay with stats */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.75rem',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.75rem',
                    color: 'white'
                  }}>
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
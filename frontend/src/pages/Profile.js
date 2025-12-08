import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { username } = useParams();
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
      padding: '2rem 0',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Profile Header */}
        <div className="card mb-4">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '1rem'
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
              marginBottom: '1rem',
              backgroundImage: user.profile_pic && user.profile_pic !== 'default.jpg' 
                ? `url(${user.profile_pic})` 
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {(!user.profile_pic || user.profile_pic === 'default.jpg') 
                && user.username.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <h1 style={{ 
              margin: '0 0 0.5rem 0', 
              color: 'var(--text-primary)',
              fontSize: '2rem'
            }}>
              {user.username}
            </h1>
            
            {user.email && (
              <p style={{ 
                margin: '0 0 1rem 0', 
                color: 'var(--text-secondary)',
                fontSize: '1rem'
              }}>
                {user.email}
              </p>
            )}

            {user.bio && (
              <p style={{
                margin: '0 0 1.5rem 0',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
                maxWidth: '500px'
              }}>
                {user.bio}
              </p>
            )}

            {/* Stats */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>
                  {posts.length}
                </div>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  {posts.length === 1 ? 'Post' : 'Posts'}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>
                  {user.followers_count || 0}
                </div>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  Followers
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>
                  {user.following_count || 0}
                </div>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  Following
                </div>
              </div>
            </div>

            {/* Join Date */}
            <p style={{ 
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              Joined {formatDate(user.created_at)}
            </p>

            {/* Follow Button */}
            {!isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={isFollowLoading}
                className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                style={{
                  minWidth: '120px',
                  opacity: isFollowLoading ? 0.7 : 1
                }}
              >
                {isFollowLoading 
                  ? 'Loading...' 
                  : isFollowing 
                    ? 'Unfollow' 
                    : 'Follow'
                }
              </button>
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div className="card">
          <div style={{ padding: '1rem 1rem 0 1rem' }}>
            <h3 style={{ 
              margin: '0 0 1rem 0',
              color: 'var(--text-primary)'
            }}>
              {isOwnProfile ? 'Your Posts' : `${user.username}'s Posts`}
            </h3>
          </div>

          {posts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              color: 'var(--text-secondary)'
            }}>
              <p>
                {isOwnProfile 
                  ? "You haven't posted anything yet." 
                  : `${user.username} hasn't posted anything yet.`
                }
              </p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post, index) => (
                <div 
                  key={post.id} 
                  style={{
                    padding: '1rem',
                    borderBottom: index < posts.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  {/* Post Date */}
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem'
                  }}>
                    {formatPostDate(post.created_at)}
                  </div>

                  {/* Post Content */}
                  <div style={{
                    marginBottom: '1rem',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)'
                  }}>
                    {post.content}
                  </div>

                  {/* Post Image */}
                  {post.image_url && (
                    <div style={{ marginBottom: '1rem' }}>
                      <img
                        src={post.image_url}
                        alt="Post content"
                        style={{
                          width: '100%',
                          borderRadius: 'var(--border-radius)',
                          maxHeight: '400px',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  )}

                  {/* Post Stats */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>
                      {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                    </span>
                    <span>
                      {post.comments} {post.comments === 1 ? 'comment' : 'comments'}
                    </span>
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
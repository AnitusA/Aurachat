import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  const [commentInputs, setCommentInputs] = useState({});
  const [isCommenting, setIsCommenting] = useState({});
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

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

  const handleLike = async (postId) => {
    try {
      const response = await api.post(`/posts/${postId}/like`);
      
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: response.data.is_liked,
              likes: response.data.likes_count
            }
          : post
      ));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const fetchFollowers = async () => {
    setIsLoadingLists(true);
    try {
      const response = await api.get(`/users/followers?user_id=${user.id}`);
      setFollowersList(response.data.followers || []);
      setShowFollowers(true);
      setShowFollowing(false);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const fetchFollowing = async () => {
    setIsLoadingLists(true);
    try {
      const response = await api.get(`/users/following?user_id=${user.id}`);
      setFollowingList(response.data.following || []);
      setShowFollowing(true);
      setShowFollowers(false);
    } catch (error) {
      console.error('Failed to fetch following:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const startConversation = async (targetUser) => {
    try {
      // Send an initial message to start the conversation
      await api.post('/messages', {
        receiver_id: targetUser.id,
        content: `Hi ${targetUser.username}! I found you on your profile.`
      });

      // Navigate to messages page
      window.location.href = '/messages';
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    setIsCommenting({ ...isCommenting, [postId]: true });
    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        content: commentText
      });

      // Update the post with the new comment
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              comments_list: [...(post.comments_list || []), response.data.comment],
              comments: (post.comments || 0) + 1
            }
          : post
      ));

      // Clear the input
      setCommentInputs({ ...commentInputs, [postId]: '' });
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsCommenting({ ...isCommenting, [postId]: false });
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

    // Calculate the difference in days
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
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
                  {user.posts_count || 0}
                </div>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  Posts
                </div>
              </div>
              
              <div 
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={fetchFollowers}
              >
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
              
              <div 
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={fetchFollowing}
              >
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

            {/* Action Button */}
            {isOwnProfile ? (
              <Link 
                to="/profile/edit"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                ⚙️ Edit Profile
              </Link>
            ) : (
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

        {/* Followers/Following Lists */}
        {(showFollowers || showFollowing) && (
          <div className="card mb-4">
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
                  {showFollowers ? 'Followers' : 'Following'}
                </h3>
                <button
                  onClick={() => {
                    setShowFollowers(false);
                    setShowFollowing(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ×
                </button>
              </div>

              {isLoadingLists ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--text-secondary)'
                }}>
                  Loading...
                </div>
              ) : (
                <div>
                  {(showFollowers ? followersList : followingList).length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {showFollowers ? 'No followers yet' : 'Not following anyone yet'}
                    </div>
                  ) : (
                    (showFollowers ? followersList : followingList).map((person) => (
                      <div
                        key={person.id}
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
                          onClick={() => window.location.href = `/profile/${person.username}`}
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
                            backgroundImage: person.profile_pic && person.profile_pic !== 'default.jpg'
                              ? `url(${person.profile_pic})`
                              : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}>
                            {(!person.profile_pic || person.profile_pic === 'default.jpg')
                              && person.username?.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div style={{
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              marginBottom: '0.25rem'
                            }}>
                              @{person.username}
                            </div>
                            {person.bio && (
                              <div style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                maxWidth: '300px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {person.bio}
                              </div>
                            )}
                          </div>
                        </div>

                        {person.id !== currentUser?.id && (
                          <button
                            onClick={() => startConversation(person)}
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
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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

                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: 'var(--border-radius)',
                      marginBottom: '1rem',
                      fontSize: '0.875rem',
                      color: post.is_liked ? 'var(--primary-color)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>
                      {post.is_liked ? '❤️' : '🤍'}
                    </span>
                    {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                  </button>

                  {/* Comments Section */}
                  {post.comments_list && post.comments_list.length > 0 && (
                    <div style={{
                      marginBottom: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-light)'
                    }}>
                      {post.comments_list.map((comment) => (
                        <div key={comment.id} style={{
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--border-radius)',
                          border: '1px solid var(--border-light)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              marginRight: '0.5rem',
                              backgroundImage: comment.author?.profile_pic && comment.author.profile_pic !== 'default.jpg' 
                                ? `url(${comment.author.profile_pic})` 
                                : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}>
                              {(!comment.author?.profile_pic || comment.author.profile_pic === 'default.jpg') 
                                && (comment.author?.username?.charAt(0).toUpperCase() || 'U')}
                            </div>
                            <span style={{
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem'
                            }}>
                              {comment.author?.username || 'Unknown User'}
                            </span>
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)'
                            }}>
                              {formatPostDate(comment.created_at)}
                            </span>
                          </div>
                          <div style={{
                            color: 'var(--text-primary)',
                            lineHeight: '1.4'
                          }}>
                            {comment.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  <div style={{
                    marginBottom: '1rem'
                  }}>
                    <form onSubmit={(e) => handleAddComment(e, post.id)} style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({
                          ...commentInputs,
                          [post.id]: e.target.value
                        })}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!commentInputs[post.id]?.trim() || isCommenting[post.id]}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          opacity: !commentInputs[post.id]?.trim() ? 0.5 : 1
                        }}
                      >
                        {isCommenting[post.id] ? '...' : 'Comment'}
                      </button>
                    </form>
                  </div>

                  {/* Post Stats */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                  }}>
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
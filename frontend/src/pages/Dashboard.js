import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';import { HeartIcon, ChatBubbleLeftIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';import Notes from '../components/Notes';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});
  const [isCommenting, setIsCommenting] = useState({});

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts');
        setPosts(response.data.posts || []);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      }
    };

    fetchPosts();
  }, []);

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

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    setIsCommenting({ ...isCommenting, [postId]: true });
    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        content: commentText
      });

      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              comments_list: [...(post.comments_list || []), response.data.comment],
              comments: (post.comments || 0) + 1
            }
          : post
      ));

      setCommentInputs({ ...commentInputs, [postId]: '' });
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsCommenting({ ...isCommenting, [postId]: false });
    }
  };

  const handleShare = (postId) => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        url: postUrl
      }).catch((error) => console.log('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(postUrl);
      alert('Post link copied to clipboard!');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="dashboard-page" style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-secondary)',
      padding: '1rem 0 2rem 0'
    }}>
      {/* Notes Section */}
      <Notes />
      
      {/* Posts Feed */}
      <div className="container" style={{
        maxWidth: '650px',
        margin: '2rem auto',
        padding: '0 1rem'
      }}>
        {posts.length === 0 ? (
          <div className="card" style={{
            textAlign: 'center',
            padding: '3rem 2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No posts yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Be the first to share something!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post-card" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-lg)',
              marginBottom: '1.5rem',
              overflow: 'hidden',
              animation: 'fadeInScale 0.4s ease-out'
            }}>
              {/* Post Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-light)'
              }}>
                <div 
                  onClick={() => navigate(`/profile/${post.author?.username}`)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: post.author?.profile_pic && post.author.profile_pic !== 'default.jpg'
                      ? `url(${post.author.profile_pic}) center/cover`
                      : 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {!(post.author?.profile_pic && post.author.profile_pic !== 'default.jpg') && 
                    (post.author?.username?.charAt(0).toUpperCase() || 'U')}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 
                    onClick={() => navigate(`/profile/${post.author?.username}`)}
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'inline-block',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--primary-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                  >
                    {post.author?.username || 'Unknown User'}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)'
                  }}>
                    {formatDate(post.created_at)}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              {post.content && (
                <div style={{
                  padding: '1.5rem',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}>
                  {post.content}
                </div>
              )}

              {/* Post Media */}
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post"
                  style={{
                    width: '100%',
                    maxHeight: '500px',
                    objectFit: 'cover'
                  }}
                />
              )}

              {post.video_url && (
                <div style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  background: '#000'
                }}>
                  <iframe
                    src={post.video_url}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    allowFullScreen
                  />
                </div>
              )}

              {/* Post Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-light)'
              }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    color: post.is_liked ? 'var(--danger-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    if (!post.is_liked) e.currentTarget.style.color = 'var(--primary-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    if (!post.is_liked) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {post.is_liked ? (
                    <HeartIconSolid style={{ width: '1.5rem', height: '1.5rem' }} />
                  ) : (
                    <HeartIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                  )}
                  {post.likes || 0}
                </button>

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--primary-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <ChatBubbleLeftIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                  {post.comments || 0}
                </button>

                <button
                  onClick={() => handleShare(post.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--primary-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <ShareIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                  Share
                </button>
              </div>

              {/* Comments Section */}
              {post.comments_list && post.comments_list.length > 0 && (
                <div style={{
                  padding: '1rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {post.comments_list.map((comment, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: comment.author?.profile_pic && comment.author.profile_pic !== 'default.jpg'
                          ? `url(${comment.author.profile_pic}) center/cover`
                          : 'var(--primary-gradient)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}>
                        {!(comment.author?.profile_pic && comment.author.profile_pic !== 'default.jpg') &&
                          (comment.author?.username?.charAt(0).toUpperCase() || comment.username?.charAt(0).toUpperCase() || 'U')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          marginBottom: '0.25rem'
                        }}>
                          {comment.author?.username || comment.username}
                        </div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.5'
                        }}>
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Form */}
              <form onSubmit={(e) => handleAddComment(e, post.id)} style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border-light)'
              }}>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '24px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-color)';
                    e.target.style.background = 'var(--bg-card)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.background = 'var(--bg-secondary)';
                  }}
                />
                <button
                  type="submit"
                  disabled={isCommenting[post.id] || !commentInputs[post.id]?.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--primary-gradient)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'all var(--transition-fast)',
                    opacity: (isCommenting[post.id] || !commentInputs[post.id]?.trim()) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isCommenting[post.id] && commentInputs[post.id]?.trim()) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {isCommenting[post.id] ? 'Posting...' : 'Post'}
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;

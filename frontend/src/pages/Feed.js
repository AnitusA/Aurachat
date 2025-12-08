import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const Feed = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const [isCommenting, setIsCommenting] = useState({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts');
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
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

  const formatDate = (dateString) => {
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
      <div className="feed-loading" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="feed-page" style={{
      minHeight: 'calc(100vh - var(--navbar-height))',
      padding: '2rem 0',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Posts Feed */}
        {posts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              No posts yet
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Follow some users to see their posts in your feed, or create your first post!
            </p>
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <div key={post.id} className="card mb-4">
                {/* Post Header */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onClick={() => navigate(`/profile/${post.author?.username}`)}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
                    marginRight: '0.75rem',
                    backgroundImage: post.author?.profile_pic && post.author.profile_pic !== 'default.jpg' 
                      ? `url(${post.author.profile_pic})` 
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {(!post.author?.profile_pic || post.author.profile_pic === 'default.jpg') 
                      && (post.author?.username?.charAt(0).toUpperCase() || 'U')}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {post.author?.username || 'Unknown User'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {formatDate(post.created_at)}
                    </div>
                  </div>
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

                {/* Post Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      color: post.is_liked ? 'var(--primary-color)' : 'var(--text-secondary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>
                      {post.is_liked ? '❤️' : '🤍'}
                    </span>
                    {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                  </button>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>💬</span>
                    {post.comments} {post.comments === 1 ? 'comment' : 'comments'}
                  </div>
                </div>

                {/* Comments Section */}
                {post.comments_list && post.comments_list.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
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
                            {formatDate(comment.created_at)}
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
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-light)'
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
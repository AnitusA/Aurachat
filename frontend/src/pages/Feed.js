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
  const [shorts, setShorts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState({});
  const [isCommenting, setIsCommenting] = useState({});

  useEffect(() => {
    fetchPosts();
    fetchShorts();
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

  const fetchShorts = async () => {
    try {
      const response = await api.get('/youtube/shorts?max_results=20');
      if (response.data.shorts) {
        // Convert shorts to post-like format - only showing shorts
        const shortsAsPosts = response.data.shorts.map(short => ({
          id: `short_${short.id}`,
          type: 'short',
          content: short.title,
          video_url: short.embed_url,
          video_id: short.id,
          thumbnail: short.thumbnail,
          author: {
            username: short.channel,
            profile_pic: short.thumbnail
          },
          created_at: short.published_at,
          likes: 0,
          comments: 0,
          is_liked: false,
          comments_list: []
        }));
        setShorts(shortsAsPosts);
      }
    } catch (error) {
      console.error('Failed to fetch shorts:', error);
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
      backgroundColor: 'var(--bg-primary)',
      overflowX: 'hidden'
    }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Only Show YouTube Shorts */}
        {shorts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Loading YouTube Shorts...
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Please wait while we fetch the latest shorts for you!
            </p>
          </div>
        ) : (
          <div className="posts-list" style={{ overflowY: 'hidden' }}>
            {/* Only show shorts */}
            {shorts.map((post, index) => (
              <div key={post.id} className="card mb-4">
                {/* Post Header */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    cursor: post.type === 'short' ? 'default' : 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onClick={() => post.type !== 'short' && navigate(`/profile/${post.author?.username}`)}
                  onMouseEnter={(e) => post.type !== 'short' && (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => post.type !== 'short' && (e.currentTarget.style.opacity = '1')}
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {post.author?.username || 'Unknown User'}
                      {post.type === 'short' && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#FF0000',
                          color: 'white',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          YouTube Short
                        </span>
                      )}
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

                {/* YouTube Short Video */}
                {post.type === 'short' && post.video_url && (
                  <div style={{ marginBottom: '1rem', position: 'relative', paddingBottom: '177.78%', height: 0 }}>
                    <iframe
                      src={post.video_url}
                      title={post.content}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 'var(--border-radius)'
                      }}
                    />
                  </div>
                )}

                {/* Post Image */}
                {!post.type && post.image_url && (
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



                {/* Comments Section */}
                {/* Removed for shorts-only view */}

                {/* Add Comment */}
                {/* Removed for shorts-only view */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
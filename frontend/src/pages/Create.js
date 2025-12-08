import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Create = () => {
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !imageFile) return; // allow image-only posts as well

    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', newPost);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Clear form
      setNewPost('');
      setImageUrl('');
      setImageFile(null);
      setImagePreview('');
      setShowTextInput(false);

      // Navigate to feed to see the new post
      navigate('/feed');
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageSelect = (file) => {
    setImageFile(file);
    setImageUrl(''); // Clear URL if file is selected
    // local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setShowTextInput(true); // Show text input after image is selected
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="create-page" style={{
      minHeight: 'calc(100vh - var(--navbar-height))',
      padding: '2rem 0',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Create Post Form */}
        <div className="card">
          <div style={{ padding: '2rem' }}>
            <h2 style={{
              marginBottom: '2rem',
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}>
              Create New Post
            </h2>

            <form onSubmit={handleCreatePost}>
              {/* Step 1: Image Upload Section */}
              <div style={{ marginBottom: showTextInput ? '2rem' : '3rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '1rem',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  textAlign: 'center'
                }}>
                  📸 Choose an Image
                </label>

                {!imagePreview ? (
                  <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-card)',
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('image-upload').click()}>
                    <div style={{
                      fontSize: '3rem',
                      marginBottom: '1rem',
                      color: 'var(--text-secondary)'
                    }}>
                      📷
                    </div>
                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem'
                    }}>
                      Click to add an image
                    </div>
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}>
                      Choose from your computer
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{
                        width: '100%',
                        borderRadius: 'var(--border-radius)',
                        maxHeight: '400px',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                        setShowTextInput(false);
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                )}

                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleImageSelect(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />

                {/* Alternative: URL input */}
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center'
                }}>
                  <span style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    or enter image URL:
                  </span>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                        setImageFile(null);
                        setShowTextInput(true);
                      } else {
                        setImagePreview('');
                        setShowTextInput(false);
                      }
                    }}
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      width: '250px'
                    }}
                  />
                </div>
              </div>

              {/* Step 2: Thoughts Section - Only show after image is selected */}
              {showTextInput && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '1rem',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '1.1rem'
                  }}>
                    💭 Share your thoughts
                  </label>

                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's on your mind about this image?"
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      marginBottom: '1rem'
                    }}
                  />

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      color: newPost.length > 280 ? 'var(--error-color)' : 'var(--text-secondary)',
                      fontSize: '0.875rem'
                    }}>
                      {newPost.length}/280 characters
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => navigate('/feed')}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                {showTextInput && (
                  <button
                    type="submit"
                    disabled={(!newPost.trim() && !imageFile) || isPosting || newPost.length > 280}
                    className="btn btn-primary"
                    style={{
                      opacity: ((!newPost.trim() && !imageFile) || newPost.length > 280) ? 0.5 : 1,
                      fontSize: '1.1rem',
                      padding: '0.75rem 2rem'
                    }}
                  >
                    {isPosting ? '🚀 Posting...' : '🚀 Post'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;
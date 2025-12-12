import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { uploadToSupabase } from '../services/supabase';
import api from '../services/api';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    profile_pic: ''
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        profile_pic: user.profile_pic || ''
      });
      setProfilePreview(user.profile_pic || '');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image must be less than 5MB' });
        return;
      }
      setProfileImage(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let profilePicUrl = formData.profile_pic;

      // Upload new profile picture if selected
      if (profileImage) {
        const { url } = await uploadToSupabase(profileImage, 'profiles');
        profilePicUrl = url;
      }

      const updateData = {
        bio: formData.bio,
        profile_pic: profilePicUrl
      };

      const response = await api.put('/profile', updateData);
      
      if (response.data.user) {
        updateUser(response.data.user);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      };

      const response = await api.put('/profile', updateData);
      
      if (response.data.user) {
        updateUser(response.data.user);
        setMessage({ type: 'success', text: 'Account information updated successfully!' });
      }
    } catch (error) {
      console.error('Failed to update account:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update account information' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (selectedTheme) => {
    if (selectedTheme !== theme) {
      toggleTheme();
      
      // Update theme preference in backend
      api.put('/profile', { theme: selectedTheme })
        .then(() => {
          setMessage({ type: 'success', text: 'Theme updated successfully!' });
        })
        .catch(error => {
          console.error('Failed to save theme preference:', error);
        });
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'account', label: 'Account', icon: '⚙️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>Settings</h1>
          <button
            onClick={() => navigate('/profile')}
            style={styles.backButton}
          >
            ← Back to Profile
          </button>
        </div>

        <div style={styles.content}>
          {/* Sidebar Navigation */}
          <div style={styles.sidebar}>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  ...styles.sidebarItem,
                  ...(activeSection === section.id ? styles.sidebarItemActive : {})
                }}
              >
                <span style={styles.sectionIcon}>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div style={styles.mainContent}>
            {message.text && (
              <div style={{
                ...styles.message,
                ...(message.type === 'success' ? styles.messageSuccess : {}),
                ...(message.type === 'error' ? styles.messageError : {}),
                ...(message.type === 'info' ? styles.messageInfo : {})
              }}>
                {message.text}
              </div>
            )}

            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Edit Profile</h2>
                <form onSubmit={handleProfileUpdate}>
                  {/* Profile Picture */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Profile Picture</label>
                    <div style={styles.profilePicContainer}>
                      <div style={styles.profilePicWrapper}>
                        {profilePreview ? (
                          <img
                            src={profilePreview}
                            alt="Profile"
                            style={styles.profilePic}
                          />
                        ) : (
                          <div style={styles.profilePicPlaceholder}>
                            {formData.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={styles.profilePicActions}>
                        <input
                          type="file"
                          id="profile-pic"
                          accept="image/*"
                          onChange={handleImageSelect}
                          style={styles.fileInput}
                        />
                        <label htmlFor="profile-pic" style={styles.uploadButton}>
                          Choose Photo
                        </label>
                        <p style={styles.hint}>JPG, PNG or GIF. Max size 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div style={styles.formGroup}>
                    <label htmlFor="bio" style={styles.label}>Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      style={styles.textarea}
                      maxLength={200}
                    />
                    <p style={styles.charCount}>{formData.bio.length}/200</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      ...styles.submitButton,
                      ...(isLoading ? styles.submitButtonDisabled : {})
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Account Settings</h2>
                <form onSubmit={handleAccountUpdate}>
                  {/* Username */}
                  <div style={styles.formGroup}>
                    <label htmlFor="username" style={styles.label}>Username</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="[a-zA-Z0-9_]+"
                    />
                    <p style={styles.hint}>3-20 characters, letters, numbers, and underscores only</p>
                  </div>

                  {/* Email */}
                  <div style={styles.formGroup}>
                    <label htmlFor="email" style={styles.label}>Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                    <p style={styles.hint}>Make sure you have access to this email</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      ...styles.submitButton,
                      ...(isLoading ? styles.submitButtonDisabled : {})
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Appearance</h2>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Theme</label>
                  <div style={styles.themeOptions}>
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      style={{
                        ...styles.themeOption,
                        ...(theme === 'light' ? styles.themeOptionActive : {})
                      }}
                    >
                      <div style={styles.themePreview}>
                        <div style={{
                          ...styles.themePreviewInner,
                          background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
                        }}></div>
                      </div>
                      <span style={styles.themeName}>☀️ Light</span>
                      {theme === 'light' && <span style={styles.checkmark}>✓</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      style={{
                        ...styles.themeOption,
                        ...(theme === 'dark' ? styles.themeOptionActive : {})
                      }}
                    >
                      <div style={styles.themePreview}>
                        <div style={{
                          ...styles.themePreviewInner,
                          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                        }}></div>
                      </div>
                      <span style={styles.themeName}>🌙 Dark</span>
                      {theme === 'dark' && <span style={styles.checkmark}>✓</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    padding: '2rem',
  },
  wrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  backButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    gap: '2rem',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left',
  },
  sidebarItemActive: {
    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
    color: '#ffffff',
    borderColor: 'var(--primary-color)',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
  },
  sectionIcon: {
    fontSize: '1.25rem',
  },
  mainContent: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '2rem',
    border: '1px solid var(--border-color)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  message: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  messageSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  messageError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  messageInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.3s ease',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  profilePicContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  profilePicWrapper: {
    position: 'relative',
  },
  profilePic: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid var(--border-color)',
  },
  profilePicPlaceholder: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  profilePicActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: 'var(--primary-color)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  charCount: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textAlign: 'right',
    marginTop: '0.25rem',
  },
  submitButton: {
    padding: '0.875rem 2rem',
    backgroundColor: 'var(--primary-color)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '1rem',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  themeOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  themeOption: {
    padding: '1.5rem',
    backgroundColor: 'var(--bg-primary)',
    border: '2px solid var(--border-color)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    position: 'relative',
  },
  themeOptionActive: {
    borderColor: 'var(--primary-color)',
    backgroundColor: 'rgba(var(--primary-color-rgb), 0.05)',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.2)',
  },
  themePreview: {
    width: '100px',
    height: '70px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  themePreviewInner: {
    width: '100%',
    height: '100%',
  },
  themeName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  checkmark: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-color)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
};

export default Settings;

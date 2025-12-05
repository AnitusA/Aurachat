import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const ProfileEdit = () => {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const fileInputRef = useRef();

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    profile_pic: '',
    location: '',
    website: '',
    birth_date: '',
    phone: '',
    occupation: '',
    interests: '',
    social_twitter: '',
    social_instagram: '',
    social_linkedin: '',
    social_github: '',
    theme_preference: 'light',
    privacy_settings: {
      profile_visibility: 'public',
      email_visibility: 'private',
      phone_visibility: 'private',
      show_online_status: true,
      allow_messages: true
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        // Try to fetch detailed profile from backend
        const response = await api.get('/profile/detailed');
        const profileData = response.data;
        
        setProfile({
          username: profileData.username || '',
          email: profileData.email || '',
          bio: profileData.bio || '',
          profile_pic: profileData.profile_pic || profileData.avatar_url || 'default.jpg',
          location: profileData.location || '',
          website: profileData.website || '',
          birth_date: profileData.birth_date || '',
          phone: profileData.phone || '',
          occupation: profileData.occupation || '',
          interests: profileData.interests || '',
          social_twitter: profileData.social_twitter || '',
          social_instagram: profileData.social_instagram || '',
          social_linkedin: profileData.social_linkedin || '',
          social_github: profileData.social_github || '',
          theme_preference: profileData.theme_preference || 'light',
          privacy_settings: {
            profile_visibility: profileData.profile_visibility || 'public',
            email_visibility: profileData.email_visibility || 'private',
            phone_visibility: profileData.phone_visibility || 'private',
            show_online_status: profileData.show_online_status !== false,
            allow_messages: profileData.allow_messages !== false
          }
        });
        
        if (profileData.profile_pic && profileData.profile_pic !== 'default.jpg') {
          setAvatarPreview(profileData.profile_pic);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        
        // Fallback to using user data from context
        setProfile({
          username: user.username || '',
          email: user.email || '',
          bio: user.bio || '',
          profile_pic: user.profile_pic || '',
          location: '',
          website: '',
          birth_date: '',
          phone: '',
          occupation: '',
          interests: '',
          social_twitter: '',
          social_instagram: '',
          social_linkedin: '',
          social_github: '',
          theme_preference: user.theme || 'light',
          privacy_settings: {
            profile_visibility: 'public',
            email_visibility: 'private',
            phone_visibility: 'private',
            show_online_status: true,
            allow_messages: true
          }
        });
        
        if (user.profile_pic && user.profile_pic !== 'default.jpg') {
          setAvatarPreview(user.profile_pic);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('privacy_')) {
      const settingName = name.replace('privacy_', '');
      setProfile(prev => ({
        ...prev,
        privacy_settings: {
          ...prev.privacy_settings,
          [settingName]: e.target.type === 'checkbox' ? e.target.checked : value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file', 'error');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('Image size must be less than 5MB', 'error');
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setProfile(prev => ({ ...prev, profile_pic: 'default.jpg' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showMessage('All password fields are required', 'error');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('New passwords do not match', 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showMessage('New password must be at least 6 characters long', 'error');
      return;
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      showMessage('New password must be different from current password', 'error');
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.post('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      showMessage('Password changed successfully!', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      
    } catch (err) {
      console.error('Password change error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to change password. Please try again.';
      showMessage(errorMessage, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Prepare data for submission
      const submitData = {
        email: profile.email,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        birth_date: profile.birth_date,
        phone: profile.phone,
        occupation: profile.occupation,
        interests: profile.interests,
        social_twitter: profile.social_twitter,
        social_instagram: profile.social_instagram,
        social_linkedin: profile.social_linkedin,
        social_github: profile.social_github,
        theme_preference: profile.theme_preference,
        privacy_settings: profile.privacy_settings
      };

      // Include avatar URL if changed
      if (avatarPreview) {
        submitData.profile_pic = avatarPreview;
      }

      // Send to backend
      const response = await api.put('/profile/comprehensive', submitData);
      
      // Update local user context with new data
      updateUser({
        ...user,
        email: profile.email,
        bio: profile.bio,
        profile_pic: avatarPreview || 'default.jpg',
        theme: profile.theme_preference
      });

      showMessage('Profile updated successfully!', 'success');
      setAvatarFile(null);
      
    } catch (err) {
      console.error('Profile update error:', err);
      
      const errorMessage = err.response?.data?.error || 'Failed to update profile. Please try again.';
      showMessage(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-loading" style={{
        minHeight: 'calc(100vh - var(--navbar-height))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="text-center">
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit-page fade-in" style={{
      minHeight: 'calc(100vh - var(--navbar-height))',
      padding: '2rem 0',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div className="profile-header mb-4">
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Edit Profile
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Customize your AuraChat profile and preferences
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`alert mb-4`} style={{
            backgroundColor: messageType === 'error' ? 
              'rgba(220, 53, 69, 0.1)' : 'rgba(40, 167, 69, 0.1)',
            border: `1px solid ${messageType === 'error' ? '#dc3545' : '#28a745'}`,
            borderRadius: 'var(--border-radius)',
            padding: '1rem',
            color: messageType === 'error' ? '#dc3545' : '#28a745'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gap: '2rem',
            gridTemplateColumns: '1fr'
          }}>
            {/* Profile Picture Section */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                🖼️ Profile Picture
              </h3>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: avatarPreview ? 
                      `url(${avatarPreview}) center/cover` : 
                      'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem',
                    border: '4px solid var(--border-color)'
                  }}>
                    {!avatarPreview && (user?.username?.charAt(0).toUpperCase() || 'U')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {avatarPreview ? 'Current Avatar' : 'Default Avatar'}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="btn btn-primary"
                      style={{ marginRight: '0.5rem' }}
                    >
                      Upload New Avatar
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="btn btn-outline"
                      >
                        Remove Avatar
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Supported formats: JPG, PNG, GIF (max 5MB)
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                👤 Basic Information
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
              }}>
                <div>
                  <label htmlFor="username" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profile.username}
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      cursor: 'not-allowed',
                      opacity: 0.7
                    }}
                  />
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Username cannot be changed
                  </div>
                </div>

                <div>
                  <label htmlFor="email" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="phone" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="birth_date" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="birth_date"
                    name="birth_date"
                    value={profile.birth_date}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="bio" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={profile.bio}
                    onChange={handleChange}
                    placeholder="Tell us about yourself..."
                    rows="3"
                    maxLength="500"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                    textAlign: 'right'
                  }}>
                    {profile.bio.length}/500 characters
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                📍 Additional Information
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
              }}>
                <div>
                  <label htmlFor="location" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={profile.location}
                    onChange={handleChange}
                    placeholder="e.g., New York, USA"
                    maxLength="100"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="occupation" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Occupation
                  </label>
                  <input
                    type="text"
                    id="occupation"
                    name="occupation"
                    value={profile.occupation}
                    onChange={handleChange}
                    placeholder="e.g., Software Developer"
                    maxLength="100"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="website" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={profile.website}
                    onChange={handleChange}
                    placeholder="https://yourwebsite.com"
                    maxLength="200"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="interests" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Interests & Hobbies
                  </label>
                  <input
                    type="text"
                    id="interests"
                    name="interests"
                    value={profile.interests}
                    onChange={handleChange}
                    placeholder="e.g., Photography, Coding, Gaming, Travel"
                    maxLength="200"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                🔗 Social Media Links
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
              }}>
                <div>
                  <label htmlFor="social_twitter" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    🐦 Twitter
                  </label>
                  <input
                    type="url"
                    id="social_twitter"
                    name="social_twitter"
                    value={profile.social_twitter}
                    onChange={handleChange}
                    placeholder="https://twitter.com/yourusername"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="social_instagram" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    📷 Instagram
                  </label>
                  <input
                    type="url"
                    id="social_instagram"
                    name="social_instagram"
                    value={profile.social_instagram}
                    onChange={handleChange}
                    placeholder="https://instagram.com/yourusername"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="social_linkedin" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    💼 LinkedIn
                  </label>
                  <input
                    type="url"
                    id="social_linkedin"
                    name="social_linkedin"
                    value={profile.social_linkedin}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="social_github" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    🐱 GitHub
                  </label>
                  <input
                    type="url"
                    id="social_github"
                    name="social_github"
                    value={profile.social_github}
                    onChange={handleChange}
                    placeholder="https://github.com/yourusername"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Theme Preferences */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                🎨 Theme Preferences
              </h3>
              
              <div>
                <label htmlFor="theme_preference" style={{
                  display: 'block',
                  marginBottom: '1rem',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Preferred Theme
                </label>
                
                <div style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
                }}>
                  {[
                    { value: 'light', label: '☀️ Light Mode', desc: 'Bright and clean interface' },
                    { value: 'dark', label: '🌙 Dark Mode', desc: 'Easy on the eyes' },
                    { value: 'system', label: '🔄 System Default', desc: 'Follows device settings' }
                  ].map(option => (
                    <div
                      key={option.value}
                      onClick={() => handleChange({ target: { name: 'theme_preference', value: option.value } })}
                      style={{
                        padding: '1rem',
                        border: `2px solid ${profile.theme_preference === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--border-radius)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        backgroundColor: profile.theme_preference === option.value ? 
                          'rgba(102, 126, 234, 0.1)' : 'var(--bg-card)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <input
                          type="radio"
                          name="theme_preference"
                          value={option.value}
                          checked={profile.theme_preference === option.value}
                          onChange={handleChange}
                          style={{ margin: 0 }}
                        />
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{option.label}</span>
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                      }}>
                        {option.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)'
                }}>
                  <strong>💡 Current Status:</strong> You're using <strong>{theme}</strong> mode.
                  {profile.theme_preference === 'system' && (
                    <span> This follows your device's theme settings.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                🔒 Privacy Settings
              </h3>
              
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label htmlFor="privacy_profile_visibility" style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Profile Visibility
                  </label>
                  <select
                    id="privacy_profile_visibility"
                    name="privacy_profile_visibility"
                    value={profile.privacy_settings.profile_visibility}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="public">Public - Anyone can view your profile</option>
                    <option value="friends">Friends Only - Only people you follow can view</option>
                    <option value="private">Private - Only you can view</option>
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
                }}>
                  <div>
                    <label htmlFor="privacy_email_visibility" style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '500',
                      color: 'var(--text-primary)'
                    }}>
                      Email Visibility
                    </label>
                    <select
                      id="privacy_email_visibility"
                      name="privacy_email_visibility"
                      value={profile.privacy_settings.email_visibility}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="privacy_phone_visibility" style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '500',
                      color: 'var(--text-primary)'
                    }}>
                      Phone Visibility
                    </label>
                    <select
                      id="privacy_phone_visibility"
                      name="privacy_phone_visibility"
                      value={profile.privacy_settings.phone_visibility}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}>
                    <input
                      type="checkbox"
                      name="privacy_show_online_status"
                      checked={profile.privacy_settings.show_online_status}
                      onChange={handleChange}
                      style={{ margin: 0 }}
                    />
                    <span>Show online status to other users</span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}>
                    <input
                      type="checkbox"
                      name="privacy_allow_messages"
                      checked={profile.privacy_settings.allow_messages}
                      onChange={handleChange}
                      style={{ margin: 0 }}
                    />
                    <span>Allow direct messages from other users</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                🔐 Change Password
              </h3>
              
              {!showPasswordForm ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    marginBottom: '1.5rem',
                    lineHeight: '1.5'
                  }}>
                    Update your password to keep your account secure. You'll need your current password to make changes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(true)}
                    className="btn btn-outline"
                    style={{ minWidth: '180px' }}
                  >
                    🔑 Change Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword}>
                  <div style={{
                    display: 'grid',
                    gap: '1.5rem',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    <div>
                      <label htmlFor="currentPassword" style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: '500',
                        color: 'var(--text-primary)'
                      }}>
                        Current Password *
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your current password"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: '500',
                        color: 'var(--text-primary)'
                      }}>
                        New Password *
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password (min 6 characters)"
                        required
                        minLength="6"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: '500',
                        color: 'var(--text-primary)'
                      }}>
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm your new password"
                        required
                        minLength="6"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                      marginTop: '1rem'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                        }}
                        className="btn btn-outline"
                        disabled={isChangingPassword}
                        style={{ minWidth: '100px' }}
                      >
                        Cancel
                      </button>
                      
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isChangingPassword}
                        style={{ minWidth: '140px' }}
                      >
                        {isChangingPassword ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                            Changing...
                          </div>
                        ) : (
                          '🔐 Change Password'
                        )}
                      </button>
                    </div>

                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                      padding: '1rem',
                      backgroundColor: 'rgba(102, 126, 234, 0.05)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: 'var(--border-radius)'
                    }}>
                      <strong>💡 Password Security Tips:</strong><br />
                      • Use at least 8 characters with mixed case letters, numbers, and symbols<br />
                      • Avoid using personal information or common words<br />
                      • Don't reuse passwords from other accounts
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
                style={{
                  minWidth: '200px',
                  padding: '12px 2rem',
                  fontSize: '1rem'
                }}
              >
                {isSaving ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                    Saving...
                  </div>
                ) : (
                  '💾 Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;
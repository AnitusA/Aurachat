import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Notes from '../components/Notes';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile');
        // Extract profile data - response.data contains user info with nested profile
        setProfile(response.data.profile || response.data);
      } catch (err) {
        setError('Failed to load profile information');
        console.error('Profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getProfileCompleteness = () => {
    if (!profile) return 0;
    
    const fields = ['bio', 'location', 'website', 'birth_date'];
    const completedFields = fields.filter(field => profile[field] && profile[field].trim() !== '').length;
    const avatarBonus = (profile.profile_pic && profile.profile_pic !== 'default.jpg') ? 1 : 0;
    
    return Math.round(((completedFields + avatarBonus) / (fields.length + 1)) * 100);
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading" style={{
        minHeight: 'calc(100vh - var(--navbar-height))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="text-center">
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page fade-in" style={{
      minHeight: 'calc(100vh - var(--navbar-height))',
      padding: '2rem 0',
      background: `linear-gradient(135deg, 
        rgba(102, 126, 234, 0.05) 0%, 
        rgba(118, 75, 162, 0.05) 100%)`
    }}>
      {/* Notes Section */}
      <Notes />
      
      <div className="container">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <h1 style={{ marginBottom: '0.5rem' }}>
            {getGreeting()}, {user?.username || 'User'}! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Welcome to your AuraChat dashboard. Here's what's happening today.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger mb-4" style={{
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            border: '1px solid var(--danger-color)',
            borderRadius: 'var(--border-radius)',
            padding: '1rem',
            color: 'var(--danger-color)'
          }}>
            {error}
          </div>
        )}

        {/* Quick Stats */}
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Profile Completion */}
          <div className="stat-card card" style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: `conic-gradient(var(--primary-color) 0deg, var(--primary-color) ${getProfileCompleteness() * 3.6}deg, var(--border-color) ${getProfileCompleteness() * 3.6}deg, var(--border-color) 360deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                color: 'var(--primary-color)'
              }}>
                {getProfileCompleteness()}%
              </div>
            </div>
            <h3>Profile Completion</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {getProfileCompleteness() < 100 ? 'Complete your profile to get the most out of AuraChat' : 'Your profile is complete!'}
            </p>
          </div>

          {/* Theme Status */}
          <div className="stat-card card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              {theme === 'light' ? '☀️' : '🌙'}
            </div>
            <h3>Current Theme</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              You're using {theme} mode
            </p>
          </div>

          {/* User Status */}
          <div className="stat-card card" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              🟢
            </div>
            <h3>Status</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Online and ready to chat
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="action-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Profile Management */}
          <div className="action-card card">
            <h3 style={{ marginBottom: '1rem' }}>👤 Profile Management</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Customize your profile, update your information, and manage your avatar.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to="/profile" className="btn btn-primary">
                Edit Profile
              </Link>
              {getProfileCompleteness() < 100 && (
                <Link to="/profile" className="btn btn-outline">
                  Complete Profile
                </Link>
              )}
            </div>
          </div>

          {/* Chat Features */}
          <div className="action-card card">
            <h3 style={{ marginBottom: '1rem' }}>💬 Chat Features</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Start conversations, join rooms, and connect with other users.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled>
                Start Chat (Coming Soon)
              </button>
              <button className="btn btn-outline" disabled>
                Join Room (Coming Soon)
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="action-card card">
            <h3 style={{ marginBottom: '1rem' }}>⚙️ Settings</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Manage your preferences, privacy settings, and account options.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" disabled>
                Privacy Settings (Coming Soon)
              </button>
            </div>
          </div>

          {/* Help & Support */}
          <div className="action-card card">
            <h3 style={{ marginBottom: '1rem' }}>🛟 Help & Support</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Get help, report issues, or learn more about AuraChat features.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" disabled>
                Help Center (Coming Soon)
              </button>
            </div>
          </div>
        </div>

        {/* Profile Preview */}
        {profile && (
          <div className="profile-preview" style={{ marginTop: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>📋 Your Profile Preview</h3>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                {/* Avatar */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: (profile.profile_pic && profile.profile_pic !== 'default.jpg') ? 
                      `url(${profile.profile_pic}) center/cover` : 
                      'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem'
                  }}>
                    {!(profile.profile_pic && profile.profile_pic !== 'default.jpg') && (user?.username?.charAt(0).toUpperCase() || 'U')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {(profile.profile_pic && profile.profile_pic !== 'default.jpg') ? 'Custom Avatar' : 'Default Avatar'}
                  </div>
                </div>

                {/* Profile Info */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4>{user?.username}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {user?.email}
                  </p>
                  
                  {profile.bio && (
                    <div style={{ marginTop: '1rem' }}>
                      <strong>Bio:</strong>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '1rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    flexWrap: 'wrap'
                  }}>
                    {profile.location && (
                      <span>📍 {profile.location}</span>
                    )}
                    {profile.website && (
                      <span>🌐 {profile.website}</span>
                    )}
                    {profile.theme_preference && (
                      <span>🎨 Prefers {profile.theme_preference} theme</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
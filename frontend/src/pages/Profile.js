import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../services/api';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback for development
      setProfile({
        id: 1,
        username: 'current_user',
        email: 'user@example.com',
        full_name: 'Current User',
        bio: 'Welcome to my profile!',
        followers: 42,
        following: 24,
        posts: 8
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div className="main-content">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="post-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="post-avatar" style={{ width: '100px', height: '100px', margin: '0 auto 1rem', fontSize: '2rem' }}>
              {profile.full_name[0].toUpperCase()}
            </div>
            <h2>{profile.full_name}</h2>
            <p style={{ color: '#666' }}>@{profile.username}</p>
            <p>{profile.bio}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem' }}>
              <div>
                <strong>{profile.posts}</strong>
                <div style={{ fontSize: '14px', color: '#666' }}>Posts</div>
              </div>
              <div>
                <strong>{profile.followers}</strong>
                <div style={{ fontSize: '14px', color: '#666' }}>Followers</div>
              </div>
              <div>
                <strong>{profile.following}</strong>
                <div style={{ fontSize: '14px', color: '#666' }}>Following</div>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <button className="btn" style={{ marginRight: '1rem' }}>Edit Profile</button>
              <button className="btn">Settings</button>
            </div>
          </div>
        </div>
        
        <div className="post-card" style={{ marginTop: '1rem' }}>
          <h3>Recent Posts</h3>
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            Your recent posts will appear here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const initAuth = async () => {
      // First check for demo user in localStorage
      const demoUser = localStorage.getItem('demoUser');
      if (demoUser) {
        setUser(JSON.parse(demoUser));
        setLoading(false);
        return;
      }

      try {
        // Try to get current user from session
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        // Not logged in or session expired
        console.log('No active session');
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    // Clear demo user if exists
    localStorage.removeItem('demoUser');
    
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  // Demo login - no backend required
  const demoLogin = (username) => {
    const demoUser = {
      id: 'demo_' + Date.now(),
      username: username || 'DemoUser',
      email: (username || 'demo') + '@demo.local',
      bio: 'This is a demo account',
      profile_pic: 'default.jpg',
      theme: 'light',
      isDemo: true
    };
    localStorage.setItem('demoUser', JSON.stringify(demoUser));
    setUser(demoUser);
    return { success: true, user: demoUser };
  };

  const updateUser = (updatedUserData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    demoLogin,
    updateUser,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
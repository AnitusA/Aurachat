import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to intended page after login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0',
      background: `linear-gradient(135deg, 
        rgba(102, 126, 234, 0.1) 0%, 
        rgba(118, 75, 162, 0.1) 100%)`
    }}>
      <div className="container-sm">
        <div className="card fade-in" style={{
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {/* Header */}
          <div className="text-center mb-4">
            <div style={{
              width: '64px',
              height: '64px',
              background: 'var(--primary-gradient)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              margin: '0 auto 1rem'
            }}>
              A
            </div>
            <h1 style={{ marginBottom: '0.5rem' }}>Welcome Back</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Sign in to your AuraChat account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid var(--danger-color)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '12px',
              marginBottom: '1rem',
              color: 'var(--danger-color)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1
                }}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !formData.username || !formData.password}
              style={{
                width: '100%',
                marginBottom: '1rem'
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="loading-spinner"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1rem 0',
            gap: '1rem'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          {/* Demo Login Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const result = demoLogin(formData.username || 'Guest');
              if (result.success) {
                navigate(from, { replace: true });
              }
            }}
            disabled={isLoading}
            style={{
              width: '100%',
              marginBottom: '1rem'
            }}
          >
            🎮 Continue as Guest (No Backend)
          </button>

          {/* Footer */}
          <div className="text-center">
            <p style={{ color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                style={{ 
                  color: 'var(--primary-color)',
                  fontWeight: '500'
                }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
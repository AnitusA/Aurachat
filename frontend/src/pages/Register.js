import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await register(formData.username, formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        // Check if user already exists and offer login option
        const errorMessage = result.error || 'Registration failed';
        if (errorMessage.toLowerCase().includes('already exists') || 
            errorMessage.toLowerCase().includes('already registered') ||
            (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('taken'))) {
          setError(
            <span>
              {errorMessage}{' '}
              <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                Click here to login instead
              </Link>
            </span>
          );
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred';
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('already registered') ||
          (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('taken'))) {
        setError(
          <span>
            {errorMessage}{' '}
            <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
              Click here to login instead
            </Link>
          </span>
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0',
      background: `linear-gradient(135deg, 
        rgba(118, 75, 162, 0.1) 0%, 
        rgba(102, 126, 234, 0.1) 100%)`
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
            <h1 style={{ marginBottom: '0.5rem' }}>Join AuraChat</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Create your account to get started
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

          {/* Registration Form */}
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
                placeholder="Choose a username"
                required
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1,
                  borderColor: fieldErrors.username ? 'var(--danger-color)' : undefined
                }}
              />
              {fieldErrors.username && (
                <div style={{
                  color: 'var(--danger-color)',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem'
                }}>
                  {fieldErrors.username}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="email" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1,
                  borderColor: fieldErrors.email ? 'var(--danger-color)' : undefined
                }}
              />
              {fieldErrors.email && (
                <div style={{
                  color: 'var(--danger-color)',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem'
                }}>
                  {fieldErrors.email}
                </div>
              )}
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
                placeholder="Create a password"
                required
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1,
                  borderColor: fieldErrors.password ? 'var(--danger-color)' : undefined
                }}
              />
              {fieldErrors.password && (
                <div style={{
                  color: 'var(--danger-color)',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem'
                }}>
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.7 : 1,
                  borderColor: fieldErrors.confirmPassword ? 'var(--danger-color)' : undefined
                }}
              />
              {fieldErrors.confirmPassword && (
                <div style={{
                  color: 'var(--danger-color)',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem'
                }}>
                  {fieldErrors.confirmPassword}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                marginBottom: '1rem'
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="loading-spinner"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link 
                to="/login" 
                style={{ 
                  color: 'var(--primary-color)',
                  fontWeight: '500'
                }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
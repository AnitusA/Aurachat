import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileOpen(false);
  };

  // Don't render navbar on login/register pages
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Mobile Menu Button - only show when user is logged in */}
      {user && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="mobile-menu-btn btn btn-secondary"
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 1001,
            padding: '10px',
            fontSize: '1.2rem',
            display: 'none' // Hidden by default, shown on mobile via CSS
          }}
        >
          ☰
        </button>
      )}

      {/* Mobile Overlay - only show when user is logged in */}
      {user && (
        <div
          className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - only show when user is logged in */}
      {user && (
        <nav className={`navbar ${isMobileOpen ? 'open' : ''}`} style={{
          width: 'var(--sidebar-width)',
          height: '100vh',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-color)',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          transition: 'all var(--transition-normal)',
          display: 'flex',
          flexDirection: 'column'
        }}>
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Logo */}
        <Link to={user ? "/dashboard" : "/"} className="navbar-brand">
          <div className="flex items-center gap-2">
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--primary-gradient)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              A
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              AuraChat
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div style={{
        flex: 1,
        padding: '1.5rem 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {user ? (
          <>
            <Link
              to="/feed"
              className="nav-link"
              onClick={() => setIsMobileOpen(false)}
              style={{
                color: 'var(--text-primary)',
                padding: '12px 24px',
                margin: '0 8px',
                borderRadius: 'var(--border-radius-sm)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none'
              }}
            >
              📱 Feed
            </Link>
            <Link
              to="/create"
              className="nav-link"
              onClick={() => setIsMobileOpen(false)}
              style={{
                color: 'var(--text-primary)',
                padding: '12px 24px',
                margin: '0 8px',
                borderRadius: 'var(--border-radius-sm)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none'
              }}
            >
              ✏️ Create
            </Link>
            <Link
              to="/search"
              className="nav-link"
              onClick={() => setIsMobileOpen(false)}
              style={{
                color: 'var(--text-primary)',
                padding: '12px 24px',
                margin: '0 8px',
                borderRadius: 'var(--border-radius-sm)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none'
              }}
            >
              🔍 Search
            </Link>
            <Link
              to="/profile"
              className="nav-link"
              onClick={() => setIsMobileOpen(false)}
              style={{
                color: 'var(--text-primary)',
                padding: '12px 24px',
                margin: '0 8px',
                borderRadius: 'var(--border-radius-sm)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none'
              }}
            >
              👤 Profile
            </Link>
            <Link
              to="/messages"
              className="nav-link"
              onClick={() => setIsMobileOpen(false)}
              style={{
                color: 'var(--text-primary)',
                padding: '12px 24px',
                margin: '0 8px',
                borderRadius: 'var(--border-radius-sm)',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none'
              }}
            >
              💬 Messages
            </Link>
          </>
        ) : null}
      </div>

      {/* Bottom Section */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        {/* Theme Toggle */}
        <button
          onClick={() => {
            toggleTheme();
            setIsMobileOpen(false);
          }}
          className="btn btn-secondary"
          style={{
            width: '100%',
            marginBottom: '1rem',
            padding: '12px',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? '🌙' : '☀️'} Theme
        </button>

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius-sm)'
            }}>
              Welcome, {user.username}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-danger"
              style={{ width: '100%' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/login" className="btn btn-outline" style={{ width: '100%' }} onClick={() => setIsMobileOpen(false)}>
              Login
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsMobileOpen(false)}>
              Sign Up
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .nav-link:hover {
          background-color: var(--bg-tertiary);
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </nav>
      )}
    </>
  );
};

export default Navbar;
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // <-- ADDED useLocation
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  HomeIcon, 
  RectangleStackIcon, 
  PencilSquareIcon, 
  MagnifyingGlassIcon, 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  SparklesIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const SIDEBAR_WIDTH = '280px'; 
const TRANSITION_NORMAL = '0.3s ease-in-out';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); // <-- GET THE CURRENT LOCATION
  const currentPath = location.pathname;
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

  // Helper function to check if the path is active or a direct match
  const isPathActive = (path) => {
    // Treat '/' and '/dashboard' as active for 'Home' if they lead to the same component
    if (path === '/dashboard' && currentPath === '/') {
      return true;
    }
    // Check for direct match
    return currentPath.startsWith(path);
  };

  return (
    <>
      {/* Mobile Top Bar - Messages and Create (Unchanged) */}
      {user && (
        <div className="mobile-top-nav" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 1000,
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          transition: `all ${TRANSITION_NORMAL}`
        }}>
          {/* Logo on mobile top bar for better branding */}
          <Link to="/dashboard" className="mobile-navbar-brand" style={{ marginRight: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/assets/logo.png" alt="AuraChat Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
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
          </Link>

          <Link to="/messages" style={{ 
            padding: '8px', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} className={isPathActive('/messages') ? 'nav-link-active-mobile' : ''}> {/* <-- Added Active Class */}
            <ChatBubbleLeftRightIcon style={{ width: '24px', height: '24px' }} />
          </Link>
          <Link to="/create" style={{ 
            padding: '8px', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} className={isPathActive('/create') ? 'nav-link-active-mobile' : ''}> {/* <-- Added Active Class */}
            <PencilSquareIcon style={{ width: '24px', height: '24px' }} />
          </Link>
        </div>
      )}

      {/* Mobile Bottom Navigation (Updated) */}
      {user && (
        <nav className="mobile-bottom-nav" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '65px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          zIndex: 1000,
          padding: '0 0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          transition: `all ${TRANSITION_NORMAL}`
        }}>
          <Link 
            to="/dashboard" 
            className={isPathActive('/dashboard') ? 'nav-link-active-mobile' : ''} // <-- ADDED ACTIVE CLASS
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '0.5rem',
              minWidth: '60px',
              transition: 'all var(--transition-fast)'
          }}>
            <HomeIcon style={{ width: '24px', height: '24px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.75rem' }}>Home</span>
          </Link>
          
          <Link 
            to="/search" 
            className={isPathActive('/search') ? 'nav-link-active-mobile' : ''} // <-- ADDED ACTIVE CLASS
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '0.5rem',
              minWidth: '60px',
              transition: 'all var(--transition-fast)'
          }}>
            <MagnifyingGlassIcon style={{ width: '24px', height: '24px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.75rem' }}>Search</span>
          </Link>
          
          <Link 
            to="/feed" 
            className={isPathActive('/feed') ? 'nav-link-active-mobile' : ''} // <-- ADDED ACTIVE CLASS
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '0.5rem',
              minWidth: '60px',
              transition: 'all var(--transition-fast)'
          }}>
            <RectangleStackIcon style={{ width: '24px', height: '24px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.75rem' }}>Feed</span>
          </Link>
          
          <Link 
            to="/profile" 
            className={isPathActive('/profile') ? 'nav-link-active-mobile' : ''} // <-- ADDED ACTIVE CLASS
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '0.5rem',
              minWidth: '60px',
              transition: 'all var(--transition-fast)'
          }}>
            <UserIcon style={{ width: '24px', height: '24px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.75rem' }}>Profile</span>
          </Link>
          
          <Link 
            to="/parties" 
            className={isPathActive('/parties') ? 'nav-link-active-mobile' : ''} // <-- ADDED ACTIVE CLASS
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '0.5rem',
              minWidth: '60px',
              transition: 'all var(--transition-fast)'
          }}>
            <SparklesIcon style={{ width: '24px', height: '24px', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.75rem' }}>Parties</span>
          </Link>
        </nav>
      )}

      {/* Mobile Menu Button, Overlay (Unchanged) */}
      {user && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`mobile-menu-btn btn btn-secondary ${isMobileOpen ? 'open' : ''}`}
          style={{
            position: 'fixed',
            top: '0.5rem',
            left: '0.5rem',
            zIndex: 1002,
            padding: '10px',
            fontSize: '1.2rem',
            transition: `opacity ${TRANSITION_NORMAL}`,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            display: 'none'
          }}
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
        >
          {isMobileOpen ? <XMarkIcon style={{ width: '24px', height: '24px' }} /> : <Bars3Icon style={{ width: '24px', height: '24px' }} />}
        </button>
      )}

      {user && (
        <div
          className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Updated) */}
      {user && (
        <nav className={`navbar ${isMobileOpen ? 'open' : ''}`} style={{
          width: SIDEBAR_WIDTH,
          height: '100vh',
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-color)',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          transition: `transform ${TRANSITION_NORMAL}, box-shadow ${TRANSITION_NORMAL}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Logo (Unchanged) */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <Link to={user ? "/dashboard" : "/"} className="navbar-brand" onClick={() => setIsMobileOpen(false)}>
              <div className="flex items-center gap-2">
                <img 
                  src="/assets/logo.png" 
                  alt="AuraChat Logo" 
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'contain'
                  }}
                />
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

          {/* Navigation Links (Updated) */}
          <div style={{
            flex: 1,
            padding: '1.5rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto'
          }}>
            {user ? (
              <>
                {/* Home Link */}
                <Link
                  to="/dashboard"
                  className={`nav-link ${isPathActive('/dashboard') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <HomeIcon style={{ width: '20px', height: '20px' }} /> Home
                </Link>
                {/* Feed Link */}
                <Link
                  to="/feed"
                  className={`nav-link ${isPathActive('/feed') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <RectangleStackIcon style={{ width: '20px', height: '20px' }} /> Feed
                </Link>
                {/* Create Link */}
                <Link
                  to="/create"
                  className={`nav-link ${isPathActive('/create') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <PencilSquareIcon style={{ width: '20px', height: '20px' }} /> Create
                </Link>
                {/* Search Link */}
                <Link
                  to="/search"
                  className={`nav-link ${isPathActive('/search') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <MagnifyingGlassIcon style={{ width: '20px', height: '20px' }} /> Search
                </Link>
                {/* Profile Link */}
                <Link
                  to="/profile"
                  className={`nav-link ${isPathActive('/profile') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <UserIcon style={{ width: '20px', height: '20px' }} /> Profile
                </Link>
                {/* Messages Link */}
                <Link
                  to="/messages"
                  className={`nav-link ${isPathActive('/messages') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <ChatBubbleLeftRightIcon style={{ width: '20px', height: '20px' }} /> Messages
                </Link>
                {/* Parties Link */}
                <Link
                  to="/parties"
                  className={`nav-link ${isPathActive('/parties') ? 'nav-link-active' : ''}`} // <-- ADDED ACTIVE CLASS
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
                  <SparklesIcon style={{ width: '20px', height: '20px' }} /> Parties
                </Link>
              </>
            ) : null}
          </div>

          {/* Bottom Section (Unchanged) */}
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
              {theme === 'light' ? <MoonIcon style={{ width: '20px', height: '20px' }} /> : <SunIcon style={{ width: '20px', height: '20px' }} />} Theme
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
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <ArrowRightOnRectangleIcon style={{ width: '20px', height: '20px' }} /> Logout
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
        </nav>
      )}

      {/* Styles for animation, responsiveness, and active state */}
      <style>{`
        /* --- Active Link Styles --- */
        .nav-link-active {
          background: var(--primary-gradient); /* Use your primary color for active state */
          color: white !important; /* White text on primary background */
          font-weight: 600;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .nav-link-active:hover {
          background: var(--primary-gradient) !important;
          opacity: 0.9;
        }

        .nav-link-active-mobile {
          color: var(--color-primary) !important;
        }

        /* Global/Desktop Styles */
        .nav-link:hover {
          background-color: var(--bg-tertiary);
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0); 
          z-index: 999;
          visibility: hidden;
          transition: background-color ${TRANSITION_NORMAL}, visibility 0s linear ${TRANSITION_NORMAL};
        }

        .sidebar-overlay.open {
          background-color: rgba(0, 0, 0, 0.5);
          visibility: visible;
          transition: background-color ${TRANSITION_NORMAL};
        }

        /* Desktop Sidebar (Default) */
        .navbar {
          transform: translateX(0); 
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          /* Mobile Navigation Display */
          .mobile-top-nav {
            display: flex !important;
            top: 0;
          }
          
          .mobile-bottom-nav {
            display: flex !important;
            bottom: 0;
          }

          /* Show the mobile menu button */
          .mobile-menu-btn {
            display: flex !important;
            z-index: 1002;
            top: 10px !important;
            left: 10px !important;
          }
          
          /* Sidebar Styling for Mobile (Hidden by default) */
          .navbar {
            transform: translateX(calc(-1 * ${SIDEBAR_WIDTH})); 
            box-shadow: none;
            z-index: 1001;
          }

          /* Sidebar Open State (Slide-in) */
          .navbar.open {
            transform: translateX(0);
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
          }

          /* Mobile Nav Link Hover/Active */
          .mobile-bottom-nav a:hover,
          .mobile-bottom-nav a:active {
            background-color: var(--bg-hover);
            border-radius: var(--border-radius-sm);
          }
          
          .mobile-top-nav a:hover,
          .mobile-top-nav a:active {
            background-color: var(--bg-hover);
            border-radius: var(--border-radius-sm);
          }
        }
        
        /* Desktop Override Styles */
        @media (min-width: 769px) {
          /* Hide all mobile-specific elements */
          .mobile-top-nav,
          .mobile-bottom-nav,
          .mobile-menu-btn,
          .sidebar-overlay {
            display: none !important;
          }

          /* Ensure desktop sidebar is visible and fixed */
          .navbar {
            display: flex !important;
            transform: translateX(0);
            z-index: 1000;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
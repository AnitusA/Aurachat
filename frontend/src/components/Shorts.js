import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './Shorts.css';

const Shorts = ({ onClose }) => {
  const [shorts, setShorts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchShorts();
  }, []);

  const fetchShorts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/youtube/shorts?max_results=20');
      
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setShorts(response.data.shorts || []);
      }
    } catch (err) {
      console.error('Error fetching shorts:', err);
      setError('Failed to load YouTube Shorts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    const index = Math.round(container.scrollTop / container.offsetHeight);
    setCurrentIndex(index);
  };

  const scrollToNext = () => {
    if (currentIndex < shorts.length - 1) {
      const nextIndex = currentIndex + 1;
      containerRef.current?.scrollTo({
        top: nextIndex * window.innerHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      containerRef.current?.scrollTo({
        top: prevIndex * window.innerHeight,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="shorts-loading">
        <div className="spinner"></div>
        <p>Loading YouTube Shorts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shorts-error">
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button onClick={fetchShorts}>Retry</button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="shorts-empty">
        <h2>No Shorts Found</h2>
        <p>We couldn't find any YouTube Shorts at the moment.</p>
        <button onClick={fetchShorts}>Try Again</button>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  return (
    <div className="shorts-wrapper">
      {onClose && (
        <button className="shorts-close-btn" onClick={onClose}>
          ✕
        </button>
      )}
      
      <div 
        className="shorts-container" 
        ref={containerRef}
        onScroll={handleScroll}
      >
        {shorts.map((short, index) => (
          <div key={short.id} className="short">
            <iframe
              src={index === currentIndex ? short.embed_url : ''}
              title={short.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading={index === currentIndex ? 'eager' : 'lazy'}
            />
            
            <div className="short-info">
              <div className="short-channel">
                <span className="channel-icon">📺</span>
                <span className="channel-name">{short.channel}</span>
              </div>
              <h3 className="short-title">{short.title}</h3>
              {short.description && (
                <p className="short-description">
                  {short.description.substring(0, 100)}
                  {short.description.length > 100 ? '...' : ''}
                </p>
              )}
            </div>

            <div className="short-actions">
              <a 
                href={short.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="short-action-btn"
              >
                <span className="action-icon">🔗</span>
                <span className="action-label">Watch on YouTube</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="shorts-nav">
        <button 
          className="nav-btn nav-up" 
          onClick={scrollToPrevious}
          disabled={currentIndex === 0}
        >
          ▲
        </button>
        <span className="nav-counter">
          {currentIndex + 1} / {shorts.length}
        </span>
        <button 
          className="nav-btn nav-down" 
          onClick={scrollToNext}
          disabled={currentIndex === shorts.length - 1}
        >
          ▼
        </button>
      </div>
    </div>
  );
};

export default Shorts;

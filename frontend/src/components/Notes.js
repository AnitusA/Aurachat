import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Notes.css';

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [previewDuration, setPreviewDuration] = useState(30); // Default 30 seconds
  const [lyricSnippet, setLyricSnippet] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const searchTimeout = useRef(null);
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    fetchNotes();
    // Auto-refresh notes every minute
    const interval = setInterval(fetchNotes, 60000);
    
    // Cleanup audio on unmount
    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await api.get('/notes');
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const searchMusic = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/spotify/search?q=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(response.data.tracks || []);
    } catch (error) {
      console.error('Failed to search music:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchMusic(query);
    }, 500);
  };

  const togglePreview = () => {
    if (!selectedMusic || !selectedMusic.preview_url) {
      alert('No preview available for this track');
      return;
    }

    if (isPreviewPlaying) {
      // Pause
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      }
    } else {
      // Play
      if (!previewAudioRef.current) {
        const audio = new Audio(selectedMusic.preview_url);
        previewAudioRef.current = audio;

        // Update current time as it plays
        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        audio.onended = () => {
          setIsPreviewPlaying(false);
          setCurrentTime(0);
        };

        audio.onerror = () => {
          alert('Error loading preview');
          setIsPreviewPlaying(false);
        };
      }

      previewAudioRef.current.play()
        .then(() => setIsPreviewPlaying(true))
        .catch((error) => {
          console.error('Playback error:', error);
          alert('Could not play preview');
        });
    }
  };

  const captureTimestamp = () => {
    if (previewAudioRef.current) {
      const minutes = Math.floor(currentTime / 60);
      const seconds = Math.floor(currentTime % 60);
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setTimestamp(formattedTime);
    }
  };

  const seekPreview = (e) => {
    if (previewAudioRef.current) {
      const seekBar = e.currentTarget;
      const rect = seekBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * previewAudioRef.current.duration;
      previewAudioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim() && !selectedMusic) {
      return;
    }

    setIsCreating(true);
    try {
      const noteData = {
        content: noteContent.trim(),
        ...(selectedMusic && {
          music_name: selectedMusic.name,
          music_artist: selectedMusic.artist,
          music_preview_url: selectedMusic.preview_url,
          music_image: selectedMusic.image,
          spotify_track_id: selectedMusic.id,
          spotify_url: selectedMusic.spotify_url,
          lyric_snippet: lyricSnippet.trim() || null,
          timestamp: timestamp.trim() || null
        })
      };

      await api.post('/notes', noteData);
      
      // Reset form and close modal
      setNoteContent('');
      setSelectedMusic(null);
      setSearchQuery('');
      setSearchResults([]);
      setLyricSnippet('');
      setTimestamp('');
      setShowCreateModal(false);

      // Stop and cleanup preview audio
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPreviewPlaying(false);
      setCurrentTime(0);
      
      // Refresh notes
      fetchNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNoteClick = (note) => {
    setShowNoteDialog(note);
    // Auto-play music when dialog opens
    if (note.music && note.music.preview_url) {
      setTimeout(() => {
        playPreview(note.music.preview_url, note.id);
      }, 100);
    }
  };

  const closeNoteDialog = () => {
    setShowNoteDialog(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setCurrentlyPlaying(null);
    }
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
  };

  const playPreview = (previewUrl, noteId) => {
    if (!previewUrl) {
      alert('No preview available for this track');
      return;
    }

    // If already playing this track, pause it
    if (currentlyPlaying === noteId && audioRef.current) {
      audioRef.current.pause();
      setCurrentlyPlaying(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Create new audio element and play
    const audio = new Audio(previewUrl);
    audioRef.current = audio;

    // Handle play promise
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setCurrentlyPlaying(noteId);
          console.log(`Playing preview (${previewDuration}s):`, previewUrl);
          
          // Auto-stop after configured duration
          audioTimeoutRef.current = setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
              setCurrentlyPlaying(null);
            }
          }, previewDuration * 1000);
        })
        .catch((error) => {
          console.error('Playback error:', error);
          alert('Could not play preview. The track might not have a preview available.');
          setCurrentlyPlaying(null);
        });
    }

    // Reset when audio ends
    audio.onended = () => {
      setCurrentlyPlaying(null);
      audioRef.current = null;
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
    };

    // Handle errors
    audio.onerror = (e) => {
      console.error('Audio error:', e);
      alert('Error loading preview. The track might not have a preview available.');
      setCurrentlyPlaying(null);
      audioRef.current = null;
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
    };
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  return (
    <div className="notes-container">
      {/* Notes Bar */}
      <div className="notes-bar">
        {/* Add Note Button */}
        <div className="note-item add-note" onClick={() => setShowCreateModal(true)}>
          <div className="note-avatar">
            <span style={{ fontSize: '2rem' }}>+</span>
          </div>
          <span className="note-username">Your Note</span>
        </div>

        {/* Notes List */}
        {notes.map((note) => (
          <div 
            key={note.id} 
            className={`note-item ${note.music ? 'has-music' : ''}`}
            onClick={() => handleNoteClick(note)}
          >
            <div 
              className="note-avatar"
              style={{
                backgroundImage: note.profile_pic && note.profile_pic !== 'default.jpg'
                  ? `url(${note.profile_pic})`
                  : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {(!note.profile_pic || note.profile_pic === 'default.jpg') && 
                note.username.charAt(0).toUpperCase()}
              {note.music && (
                <div className="note-music-indicator">
                  {currentlyPlaying === note.id ? '♪' : '♫'}
                </div>
              )}
            </div>
            <div className="note-info">
              <span className="note-username">{note.username}</span>
              <span className="note-caption">
                {note.content || (note.music && note.music.name) || ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="notes-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header">
              <h2>Create a Note</h2>
              <button onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="notes-modal-body">
              {/* Note Content */}
              <div className="form-group">
                <label>Your thoughts (optional)</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={100}
                  rows={3}
                />
                <small>{noteContent.length}/100</small>
              </div>

              {/* Selected Music Display */}
              {selectedMusic && (
                <div className="selected-music">
                  <img src={selectedMusic.image} alt={selectedMusic.name} />
                  <div className="selected-music-info">
                    <strong>{selectedMusic.name}</strong>
                    <span>{selectedMusic.artist}</span>
                  </div>
                  <button onClick={() => {
                    setSelectedMusic(null);
                    setLyricSnippet('');
                    setTimestamp('');
                    if (previewAudioRef.current) {
                      previewAudioRef.current.pause();
                      previewAudioRef.current = null;
                    }
                    setIsPreviewPlaying(false);
                    setCurrentTime(0);
                  }}>×</button>
                </div>
              )}

              {/* Music Player - Only show when music is selected and has preview */}
              {selectedMusic && selectedMusic.preview_url && (
                <div className="music-player-section">
                  <div className="player-header">
                    <h4>🎵 Listen & Set Timestamp</h4>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                      Play the full song or use quick preview to capture the moment
                    </p>
                  </div>

                  {/* Full Song Player */}
                  <div className="full-song-player">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${selectedMusic.id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      style={{ borderRadius: '12px' }}
                    ></iframe>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                      ⬆️ Full song player - Listen and note the timestamp manually
                    </p>
                  </div>

                  <div className="divider-text">
                    <span>OR use quick preview</span>
                  </div>

                  <div className="player-controls">
                    <button 
                      className="play-pause-btn"
                      onClick={togglePreview}
                    >
                      {isPreviewPlaying ? '⏸️ Pause' : '▶️ Play 30s Preview'}
                    </button>

                    <button 
                      className="capture-btn"
                      onClick={captureTimestamp}
                      disabled={!isPreviewPlaying && currentTime === 0}
                    >
                      📍 Capture Time
                    </button>
                  </div>

                  {/* Seek Bar */}
                  <div className="seek-bar-container" onClick={seekPreview}>
                    <div className="seek-bar">
                      <div 
                        className="seek-progress" 
                        style={{ 
                          width: previewAudioRef.current 
                            ? `${(currentTime / previewAudioRef.current.duration) * 100}%` 
                            : '0%' 
                        }}
                      />
                      <div 
                        className="seek-handle"
                        style={{ 
                          left: previewAudioRef.current 
                            ? `${(currentTime / previewAudioRef.current.duration) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                    <div className="time-display">
                      <span>{formatTime(currentTime)}</span>
                      <span>
                        {previewAudioRef.current ? formatTime(previewAudioRef.current.duration || 30) : '0:30'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show Spotify embed if no preview available */}
              {selectedMusic && !selectedMusic.preview_url && (
                <div className="music-player-section">
                  <div className="player-header">
                    <h4>🎵 Listen & Set Timestamp</h4>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                      Listen to the full song and manually enter the timestamp below
                    </p>
                  </div>

                  <div className="full-song-player">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${selectedMusic.id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      style={{ borderRadius: '12px' }}
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Lyric Annotation - Only show when music is selected */}
              {selectedMusic && (
                <div className="lyric-annotation-section">
                  <div className="annotation-header">
                    <h3>📝 Annotate a Specific Part</h3>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                      Highlight your favorite line or moment in this song
                    </p>
                  </div>
                  
                  <div className="form-group">
                    <label>
                      Lyric or Part of Song
                      <span style={{ color: '#999', fontWeight: 'normal', marginLeft: '5px' }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={lyricSnippet}
                      onChange={(e) => setLyricSnippet(e.target.value)}
                      placeholder='e.g., "Never gonna give you up..."'
                      maxLength={200}
                    />
                    <small>{lyricSnippet.length}/200</small>
                  </div>

                  <div className="form-group">
                    <label>
                      Timestamp
                      <span style={{ color: '#999', fontWeight: 'normal', marginLeft: '5px' }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={timestamp}
                      onChange={(e) => setTimestamp(e.target.value)}
                      placeholder="e.g., 1:23 or 0:45"
                      maxLength={10}
                    />
                    <small style={{ color: '#666' }}>
                      Format: M:SS (e.g., 1:23 for 1 minute 23 seconds)
                    </small>
                  </div>
                </div>
              )}

              {/* Music Search */}
              {!selectedMusic && (
                <>
                  <div className="form-group">
                    <label>Preview Duration (seconds)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range"
                        min="10"
                        max="30"
                        value={previewDuration}
                        onChange={(e) => setPreviewDuration(parseInt(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontWeight: 'bold', minWidth: '40px' }}>{previewDuration}s</span>
                    </div>
                    <small style={{ color: '#666' }}>
                      Set how long music previews play (10-30 seconds)
                    </small>
                  </div>
                  
                  <div className="form-group">
                    <label>Add Music from Spotify</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search for a song..."
                    />
                  </div>

                  {/* Search Results */}
                  {isSearching && (
                    <div className="loading-spinner-container">
                      <div className="spinner-icon"></div>
                      <span className="spinner-text">Searching...</span>
                    </div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="music-results">
                      {searchResults.map((track) => (
                        <div
                          key={track.id}
                          className="music-result-item"
                          onClick={() => {
                            setSelectedMusic(track);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <img src={track.image} alt={track.name} />
                          <div className="music-result-info">
                            <strong>{track.name}</strong>
                            <span>{track.artist}</span>
                            {track.preview_url && (
                              <span style={{ color: '#1DB954', fontSize: '0.75rem' }}>
                                ✓ Preview available
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="notes-modal-footer">
              <button 
                onClick={handleCreateNote}
                disabled={isCreating || (!noteContent.trim() && !selectedMusic)}
                className="btn btn-primary"
              >
                {isCreating ? 'Creating...' : 'Create Note'}
              </button>
              <p className="note-expiry-info">⏰ Note will expire in 12 hours</p>
            </div>
          </div>
        </div>
      )}

      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="notes-modal-overlay" onClick={closeNoteDialog}>
          <div className="note-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="note-dialog-close" onClick={closeNoteDialog}>×</button>
            
            {showNoteDialog.content && (
              <div className="note-dialog-text">
                <p>{showNoteDialog.content}</p>
              </div>
            )}

            {showNoteDialog.music && (
              <div className="note-dialog-music">
                {showNoteDialog.music.preview_url ? (
                  <img src={showNoteDialog.music.image} alt={showNoteDialog.music.name} />
                ) : (
                  <iframe
                    src={`https://open.spotify.com/embed/track/${showNoteDialog.music.spotify_track_id}?utm_source=generator&theme=0`}
                    width="100%"
                    height="352"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  ></iframe>
                )}
                <div className="note-dialog-song-info">
                  <strong>{showNoteDialog.music.name}</strong>
                  <span>{showNoteDialog.music.artist}</span>
                  
                  {/* Show lyric annotation if exists */}
                  {(showNoteDialog.music.lyric_snippet || showNoteDialog.music.timestamp) && (
                    <div className="lyric-annotation-display">
                      {showNoteDialog.music.timestamp && (
                        <div className="annotation-timestamp">
                          ⏱️ {showNoteDialog.music.timestamp}
                        </div>
                      )}
                      {showNoteDialog.music.lyric_snippet && (
                        <div className="annotation-lyric">
                          <span className="quote-icon">"</span>
                          {showNoteDialog.music.lyric_snippet}
                          <span className="quote-icon">"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;

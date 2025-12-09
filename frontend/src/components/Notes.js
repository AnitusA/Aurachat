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
  const searchTimeout = useRef(null);
  const audioRef = useRef(null);

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
          spotify_url: selectedMusic.spotify_url
        })
      };

      await api.post('/notes', noteData);
      
      // Reset form and close modal
      setNoteContent('');
      setSelectedMusic(null);
      setSearchQuery('');
      setSearchResults([]);
      setShowCreateModal(false);
      
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
          console.log('Playing preview:', previewUrl);
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
    };

    // Handle errors
    audio.onerror = (e) => {
      console.error('Audio error:', e);
      alert('Error loading preview. The track might not have a preview available.');
      setCurrentlyPlaying(null);
      audioRef.current = null;
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
                  <button onClick={() => setSelectedMusic(null)}>×</button>
                </div>
              )}

              {/* Music Search */}
              {!selectedMusic && (
                <>
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

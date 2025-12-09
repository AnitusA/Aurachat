"""Routes for Instagram-style Notes with Spotify music"""
from flask import Blueprint, request, jsonify, session
from datetime import datetime
from app import db
from app.models.note import Note
from app.services.spotify_service import SpotifyService

notes_bp = Blueprint('notes', __name__)

def login_required_check():
    """Check if user is logged in"""
    return 'user_id' in session

def get_current_user_id():
    """Get current user ID from session"""
    return session.get('user_id')

@notes_bp.route('/api/notes', methods=['GET'])
def get_notes():
    """Get all active notes (not expired)"""
    try:
        # Cleanup expired notes first
        Note.cleanup_expired()
        
        # Get active notes
        notes = Note.query.filter(
            Note.expires_at > datetime.utcnow()
        ).order_by(Note.created_at.desc()).all()
        
        return jsonify({
            'notes': [note.to_dict() for note in notes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notes_bp.route('/api/notes', methods=['POST'])
def create_note():
    """Create a new note with optional music"""
    if not login_required_check():
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.json
        user_id = get_current_user_id()
        
        # Delete user's previous note if exists
        old_note = Note.query.filter_by(user_id=user_id).first()
        if old_note:
            db.session.delete(old_note)
        
        # Create new note
        new_note = Note(
            user_id=user_id,
            content=data.get('content'),
            music_name=data.get('music_name'),
            music_artist=data.get('music_artist'),
            music_preview_url=data.get('music_preview_url'),
            music_image=data.get('music_image'),
            spotify_track_id=data.get('spotify_track_id'),
            spotify_url=data.get('spotify_url')
        )
        
        db.session.add(new_note)
        db.session.commit()
        
        return jsonify({
            'message': 'Note created successfully',
            'note': new_note.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notes_bp.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    if not login_required_check():
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        note = Note.query.get_or_404(note_id)
        user_id = get_current_user_id()
        
        # Check if user owns the note
        if note.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({'message': 'Note deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notes_bp.route('/api/spotify/search', methods=['GET'])
def search_music():
    """Search for music on Spotify"""
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 10, type=int)
        
        if not query:
            return jsonify({'tracks': []}), 200
        
        tracks = SpotifyService.search_tracks(query, limit)
        
        return jsonify({'tracks': tracks}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notes_bp.route('/api/notes/cleanup', methods=['POST'])
def cleanup_notes():
    """Manually trigger cleanup of expired notes"""
    try:
        count = Note.cleanup_expired()
        return jsonify({
            'message': f'Cleaned up {count} expired notes'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

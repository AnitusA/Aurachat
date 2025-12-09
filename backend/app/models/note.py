"""Note Model for Instagram-style notes with music"""
from datetime import datetime, timedelta
from app import db

class Note(db.Model):
    __tablename__ = 'note'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text)
    music_name = db.Column(db.String(255))
    music_artist = db.Column(db.String(255))
    music_preview_url = db.Column(db.String(500))
    music_image = db.Column(db.String(500))
    spotify_track_id = db.Column(db.String(100))
    spotify_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    # Relationship
    author = db.relationship('User', backref=db.backref('notes', lazy='dynamic'))
    
    def __init__(self, **kwargs):
        super(Note, self).__init__(**kwargs)
        if not self.expires_at:
            # Notes expire after 12 hours
            self.expires_at = datetime.utcnow() + timedelta(hours=12)
    
    def to_dict(self):
        """Convert note to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.author.username,
            'profile_pic': self.author.profile_pic,
            'content': self.content,
            'music': {
                'name': self.music_name,
                'artist': self.music_artist,
                'preview_url': self.music_preview_url,
                'image': self.music_image,
                'spotify_track_id': self.spotify_track_id,
                'spotify_url': self.spotify_url
            } if self.music_name else None,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'is_expired': datetime.utcnow() > self.expires_at
        }
    
    @staticmethod
    def cleanup_expired():
        """Delete expired notes"""
        expired_notes = Note.query.filter(Note.expires_at < datetime.utcnow()).all()
        for note in expired_notes:
            db.session.delete(note)
        db.session.commit()
        return len(expired_notes)

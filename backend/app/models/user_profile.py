from app import db
from datetime import datetime, timezone

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Reference correct table
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))
    website = db.Column(db.String(200))
    birth_date = db.Column(db.Date)
    phone = db.Column(db.String(20))
    occupation = db.Column(db.String(100))
    interests = db.Column(db.Text)
    avatar_url = db.Column(db.String(500))
    theme_preference = db.Column(db.String(20), default='system')  # 'light', 'dark', 'system'
    
    # Social media links
    social_twitter = db.Column(db.String(200))
    social_instagram = db.Column(db.String(200))
    social_linkedin = db.Column(db.String(200))
    social_github = db.Column(db.String(200))
    
    # Privacy settings (stored as JSON or separate fields)
    profile_visibility = db.Column(db.String(20), default='public')  # 'public', 'friends', 'private'
    email_visibility = db.Column(db.String(20), default='private')   # 'public', 'friends', 'private'
    phone_visibility = db.Column(db.String(20), default='private')   # 'public', 'friends', 'private'
    show_online_status = db.Column(db.Boolean, default=True)
    allow_messages = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    def __init__(self, user_id, **kwargs):
        self.user_id = user_id
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert profile object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'bio': self.bio,
            'location': self.location,
            'website': self.website,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'phone': self.phone,
            'occupation': self.occupation,
            'interests': self.interests,
            'avatar_url': self.avatar_url,
            'theme_preference': self.theme_preference,
            'social_twitter': self.social_twitter,
            'social_instagram': self.social_instagram,
            'social_linkedin': self.social_linkedin,
            'social_github': self.social_github,
            'profile_visibility': self.profile_visibility,
            'email_visibility': self.email_visibility,
            'phone_visibility': self.phone_visibility,
            'show_online_status': self.show_online_status,
            'allow_messages': self.allow_messages,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def update_from_dict(self, data):
        """Update profile from dictionary data"""
        updatable_fields = [
            'bio', 'location', 'website', 'birth_date', 'phone', 'occupation', 
            'interests', 'avatar_url', 'theme_preference', 'social_twitter', 
            'social_instagram', 'social_linkedin', 'social_github', 
            'profile_visibility', 'email_visibility', 'phone_visibility',
            'show_online_status', 'allow_messages'
        ]
        
        for field in updatable_fields:
            if field in data:
                value = data[field]
                
                # Handle date conversion
                if field == 'birth_date' and value:
                    if isinstance(value, str):
                        try:
                            value = datetime.strptime(value, '%Y-%m-%d').date()
                        except ValueError:
                            continue
                
                # Handle boolean conversion
                elif field in ['show_online_status', 'allow_messages']:
                    if isinstance(value, str):
                        value = value.lower() in ('true', '1', 'yes')
                
                setattr(self, field, value)
        
        self.updated_at = datetime.now(timezone.utc)
    
    def __repr__(self):
        return f'<UserProfile {self.user_id}>'
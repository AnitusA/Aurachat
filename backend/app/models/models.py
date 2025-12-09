from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import event
import base64

# Association table for followers
followers = db.Table('followers',
    db.Column('follower_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('followed_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    # profile_pic can hold a URL/path or base64 data-URI
    profile_pic = db.Column(db.Text, default='default.jpg')
    bio = db.Column(db.Text)
    is_private = db.Column(db.Boolean, default=False)
    theme = db.Column(db.String(20), default='light')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    posts = db.relationship('Post', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy='dynamic', cascade='all, delete-orphan')
    received_messages = db.relationship('Message', foreign_keys='Message.receiver_id', backref='receiver', lazy='dynamic', cascade='all, delete-orphan')
    
    # Self-referential many-to-many relationship for followers
    followed = db.relationship(
        'User', secondary=followers,
        primaryjoin=(followers.c.follower_id == id),
        secondaryjoin=(followers.c.followed_id == id),
        backref=db.backref('followers', lazy='dynamic'), lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def follow(self, user):
        if not self.is_following(user):
            self.followed.append(user)
    
    def unfollow(self, user):
        if self.is_following(user):
            self.followed.remove(user)
    
    def is_following(self, user):
        return self.followed.filter(
            followers.c.followed_id == user.id).count() > 0
    
    def get_follower_count(self):
        return self.followers.count()
    
    def get_following_count(self):
        return self.followed.count()
    
    def get_post_count(self):
        return self.posts.count()
    
    def update_last_seen(self):
        """Update user's last seen timestamp - placeholder"""
        # Last seen functionality not implemented yet
        pass
    
    def validate_username(self, username):
        """Validate username format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        if len(username) < 3 or len(username) > 20:
            raise ValueError("Username must be between 3 and 20 characters")
    
    def to_dict(self):
        """Convert user object to dictionary - only user table data"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'bio': self.bio or '',
            'profile_pic': self.profile_pic or 'default.jpg',
            'theme': self.theme or 'light',
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'followers': self.get_follower_count(),
            'following': self.get_following_count(),
            'posts': self.get_post_count()
        }
    
    def __repr__(self):
        return f'<User {self.username}>'


class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500))  # For external URLs
    video_url = db.Column(db.String(500))  # For YouTube/video URLs
    image_data = db.Column(db.LargeBinary)  # For uploaded files
    image_mimetype = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    comments = db.relationship('Comment', backref='post', lazy='dynamic', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='post', lazy='dynamic', cascade='all, delete-orphan')
    
    def get_like_count(self):
        return self.likes.count()
    
    def get_comment_count(self):
        return self.comments.count()
    
    def is_liked_by(self, user):
        return self.likes.filter_by(user_id=user.id).first() is not None
    
    def to_dict(self, current_user=None):
        image = self.image_url
        if self.image_data and self.image_mimetype:
            encoded_data = base64.b64encode(self.image_data).decode('utf-8')
            image = f'data:{self.image_mimetype};base64,{encoded_data}'
        return {
            'id': self.id,
            'content': self.content,
            'image': image,
            'image_url': image,  # For backward compatibility
            'video_url': self.video_url,  # YouTube/video URL
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'author': self.author.username,
            'author_username': self.author.username,
            'likes': self.get_like_count(),
            'comments': self.get_comment_count(),
            'is_liked': self.is_liked_by(current_user) if current_user else False
        }


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'author': self.author.to_dict() if self.author else None,
            'author_username': self.author.username if self.author else 'Unknown'
        }


class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    
    # Ensure a user can only like a post once
    __table_args__ = (db.UniqueConstraint('user_id', 'post_id'),)


class Follow(db.Model):
    __tablename__ = 'follow'
    
    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    following_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure a user can't follow the same user multiple times
    __table_args__ = (db.UniqueConstraint('follower_id', 'following_id', name='unique_follow'),)
    
    def to_dict(self):
        """Convert follow object to dictionary for JSON response"""
        return {
            'id': self.id,
            'follower_id': self.follower_id,
            'following_id': self.following_id,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        }
    
    def __repr__(self):
        return f'<Follow {self.follower_id} -> {self.following_id}>'


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    is_read = db.Column(db.Boolean, default=False)
    
    # Foreign keys
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'is_read': self.is_read,
            'sender': self.sender.to_dict() if self.sender else None,
            'receiver': self.receiver.to_dict() if self.receiver else None
        }
    
    def __repr__(self):
        return f'<Message {self.sender.username} -> {self.receiver.username}: {self.content[:20]}...>'
from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False, unique=True, index=True)
    username = db.Column(db.String(80), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255))
    profile_pic = db.Column(db.String(200), default='default.jpg')
    bio = db.Column(db.Text)
    is_private = db.Column(db.Boolean, default=False)
    theme = db.Column(db.String(20), default='light')
    oauth_provider = db.Column(db.String(50))
    oauth_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    posts = db.relationship('Post', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    followers = db.relationship('Follow', foreign_keys='Follow.following_id', backref='following', lazy='dynamic', cascade='all, delete-orphan')
    following = db.relationship('Follow', foreign_keys='Follow.follower_id', backref='follower', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        if len(password) < 6:
            raise ValueError('Password must be at least 6 characters long')
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_posts=False):
        """Convert user to dictionary"""
        user_data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'profile_pic': self.profile_pic,
            'bio': self.bio,
            'is_private': self.is_private,
            'theme': self.theme,
            'created_at': self.created_at.isoformat(),
            'followers_count': self.followers.count(),
            'following_count': self.following.count(),
            'posts_count': self.posts.count()
        }
        
        if include_posts:
            user_data['posts'] = [post.to_dict() for post in self.posts.order_by(Post.created_at.desc())]
        
        return user_data
    
    def is_following(self, user):
        """Check if this user is following another user"""
        return self.following.filter(Follow.following_id == user.id).first() is not None
    
    def follow(self, user):
        """Follow a user"""
        if not self.is_following(user) and user != self:
            follow = Follow(follower_id=self.id, following_id=user.id)
            db.session.add(follow)
            db.session.commit()
    
    def unfollow(self, user):
        """Unfollow a user"""
        follow = self.following.filter(Follow.following_id == user.id).first()
        if follow:
            db.session.delete(follow)
            db.session.commit()


class Post(db.Model):
    __tablename__ = 'post'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    likes = db.relationship('Like', backref='post', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='post', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self, include_author=True):
        """Convert post to dictionary"""
        post_data = {
            'id': self.id,
            'content': self.content,
            'image_url': self.image_url,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'likes_count': self.likes.count(),
            'comments_count': self.comments.count()
        }
        
        if include_author:
            post_data['author'] = {
                'id': self.author.id,
                'username': self.author.username,
                'profile_pic': self.author.profile_pic
            }
        
        return post_data
    
    def is_liked_by(self, user):
        """Check if post is liked by user"""
        return self.likes.filter(Like.user_id == user.id).first() is not None


class Like(db.Model):
    __tablename__ = 'like'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'post_id', name='unique_like'),)


class Comment(db.Model):
    __tablename__ = 'comment'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert comment to dictionary"""
        return {
            'id': self.id,
            'content': self.content,
            'user_id': self.user_id,
            'post_id': self.post_id,
            'created_at': self.created_at.isoformat(),
            'author': {
                'id': self.author.id,
                'username': self.author.username,
                'profile_pic': self.author.profile_pic
            }
        }


class Follow(db.Model):
    __tablename__ = 'follow'
    
    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    following_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('follower_id', 'following_id', name='unique_follow'),)
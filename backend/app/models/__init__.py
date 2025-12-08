# Import all models from the models.py file
from .models import User, Post, Like, Comment, Follow, Message

# Make sure all models are available when importing from app.models
__all__ = ['User', 'Post', 'Like', 'Comment', 'Follow', 'Message']
from flask import Blueprint, request, jsonify, session, current_app
from functools import wraps
from app import db
from app.models import Post, User, Like, Comment
from datetime import datetime
import os
import time
import base64
from werkzeug.utils import secure_filename

posts_bp = Blueprint('posts', __name__)

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user_id():
    return session.get('user_id')


@posts_bp.route('/posts', methods=['GET'])
@login_required
def get_posts():
    """Get all posts (feed)"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get all posts, but respect privacy settings
        all_posts = Post.query.order_by(Post.created_at.desc()).all()
        
        # Filter posts based on privacy
        posts = []
        for post in all_posts:
            post_author = post.author
            # Show post if:
            # 1. It's the user's own post, or
            # 2. The author's profile is not private, or  
            # 3. The current user follows the author
            if (post.user_id == user_id or 
                not post_author.is_private or 
                user.is_following(post_author)):
                posts.append(post)
        
        # Convert posts to dict and add like status for current user
        posts_data = []
        for post in posts:
            post_dict = post.to_dict()
            post_dict['is_liked'] = post.is_liked_by(user)
            post_dict['author'] = post.author.to_dict()  # Include full author info
            
            # Include comments in feed
            comments = Comment.query.filter_by(post_id=post.id)\
                                   .order_by(Comment.created_at.asc())\
                                   .options(db.joinedload(Comment.author))\
                                   .all()
            post_dict['comments_list'] = [comment.to_dict() for comment in comments]
            
            posts_data.append(post_dict)
        
        return jsonify({'posts': posts_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/posts', methods=['POST'])
@login_required
def create_post():
    """Create a new post"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        content = request.form.get('content') or (request.get_json().get('content') if request.is_json else None)
        
        if not content:
            return jsonify({'error': 'Content is required'}), 400
        
        image_url = None
        image_data = None
        image_mimetype = None
        
        # Check if image file is uploaded
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
                if file.mimetype not in allowed:
                    return jsonify({'error': 'Unsupported file type'}), 400
                
                data = file.read()
                max_bytes = 5 * 1024 * 1024
                if len(data) > max_bytes:
                    return jsonify({'error': 'File too large (max 5MB)'}), 400
                
                image_data = data
                image_mimetype = file.mimetype
        
        # Check for image_url if no file uploaded
        if request.is_json:
            data = request.get_json()
            image_url = data.get('image_url') or data.get('image')
        elif 'image_url' in request.form:
            image_url = request.form.get('image_url')
        
        if image_url and image_data:
            return jsonify({'error': 'Cannot provide both image file and image URL'}), 400
        
        post = Post(
            content=content,
            image_url=image_url,
            image_data=image_data,
            image_mimetype=image_mimetype,
            user_id=user_id
        )
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify({
            'message': 'Post created successfully',
            'post': post.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create post: {str(e)}'}), 500


@posts_bp.route('/posts/<int:post_id>', methods=['GET'])
@login_required
def get_post(post_id):
    """Get a specific post"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        post_dict = post.to_dict()
        post_dict['is_liked'] = post.is_liked_by(user)
        
        # Get comments
        comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
        post_dict['comments'] = [comment.to_dict() for comment in comments]
        
        return jsonify({'post': post_dict}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@posts_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    """Delete a post"""
    try:
        user_id = get_current_user_id()
        post = Post.query.get(post_id)
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        if post.user_id != user_id:
            return jsonify({'error': 'Unauthorized to delete this post'}), 403
        
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({'message': 'Post deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete post: {str(e)}'}), 500


@posts_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    """Like or unlike a post"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        post = Post.query.get(post_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        # Check if already liked
        existing_like = Like.query.filter_by(user_id=user_id, post_id=post_id).first()
        
        if existing_like:
            # Unlike the post
            db.session.delete(existing_like)
            db.session.commit()
            return jsonify({
                'message': 'Post unliked', 
                'is_liked': False,
                'likes_count': post.get_like_count()
            }), 200
        else:
            # Like the post
            like = Like(user_id=user_id, post_id=post_id)
            db.session.add(like)
            db.session.commit()
            return jsonify({
                'message': 'Post liked', 
                'is_liked': True,
                'likes_count': post.get_like_count()
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to like/unlike post: {str(e)}'}), 500


@posts_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
@login_required
def add_comment(post_id):
    """Add a comment to a post"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        post = Post.query.get(post_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Comment content is required'}), 400
        
        comment = Comment(
            content=data['content'],
            user_id=user_id,
            post_id=post_id
        )
        
        db.session.add(comment)
        db.session.commit()
        
        # Refresh the comment to ensure relationships are loaded
        db.session.refresh(comment)
        # Explicitly load the author relationship
        comment.author
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': comment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add comment: {str(e)}'}), 500


@posts_bp.route('/posts/<int:post_id>/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(post_id, comment_id):
    """Delete a comment"""
    try:
        user_id = get_current_user_id()
        comment = Comment.query.get(comment_id)
        
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404
        
        if comment.user_id != user_id:
            return jsonify({'error': 'Unauthorized to delete this comment'}), 403
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({'message': 'Comment deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete comment: {str(e)}'}), 500



@posts_bp.route('/posts/user/<int:user_id>', methods=['GET'])
@login_required
def get_user_posts(user_id):
    """Get posts from a specific user"""
    try:
        current_user_id = get_current_user_id()
        target_user = User.query.get(user_id)
        
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        # No privacy check - all profiles are public
        current_user = User.query.get(current_user_id)
        posts = Post.query.filter_by(user_id=user_id).order_by(Post.created_at.desc()).all()
        
        # Convert posts to dict and add like status for current user
        posts_data = []
        for post in posts:
            post_dict = post.to_dict()
            post_dict['is_liked'] = post.is_liked_by(current_user)
            post_dict['author'] = target_user.to_dict()  # Include full author info
            posts_data.append(post_dict)
        
        return jsonify({'posts': posts_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
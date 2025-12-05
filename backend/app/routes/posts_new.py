from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import Post, User, Like, Comment
from datetime import datetime

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
        
        # Get posts from users the current user follows, plus their own posts
        followed_users = [u.id for u in user.followed.all()]
        followed_users.append(user_id)
        
        posts = Post.query.filter(Post.user_id.in_(followed_users)).order_by(Post.created_at.desc()).all()
        
        # Convert posts to dict and add like status for current user
        posts_data = []
        for post in posts:
            post_dict = post.to_dict()
            post_dict['is_liked'] = post.is_liked_by(user)
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
        
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        post = Post(
            content=data['content'],
            image_url=data.get('image_url', ''),
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
            return jsonify({'message': 'Post unliked', 'is_liked': False}), 200
        else:
            # Like the post
            like = Like(user_id=user_id, post_id=post_id)
            db.session.add(like)
            db.session.commit()
            return jsonify({'message': 'Post liked', 'is_liked': True}), 200
        
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


@posts_bp.route('/users/<int:user_id>/posts', methods=['GET'])
@login_required
def get_user_posts(user_id):
    """Get posts from a specific user"""
    try:
        current_user_id = get_current_user_id()
        target_user = User.query.get(user_id)
        
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if profile is private and user is not following
        current_user = User.query.get(current_user_id)
        if target_user.is_private and user_id != current_user_id:
            if not current_user.is_following(target_user):
                return jsonify({'error': 'This profile is private'}), 403
        
        posts = Post.query.filter_by(user_id=user_id).order_by(Post.created_at.desc()).all()
        
        # Convert posts to dict and add like status for current user
        posts_data = []
        for post in posts:
            post_dict = post.to_dict()
            post_dict['is_liked'] = post.is_liked_by(current_user)
            posts_data.append(post_dict)
        
        return jsonify({'posts': posts_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import User, Post, Follow
from sqlalchemy import func

users_bp = Blueprint('users', __name__)

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


@users_bp.route('/profile', methods=['GET'])
@login_required
def get_current_user_profile():
    try:
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Invalid session'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    try:
        user_id = get_current_user_id()
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        # Update allowed fields in user table
        if 'bio' in data:
            user.bio = data['bio']
        if 'profile_pic' in data:
            user.profile_pic = data['profile_pic']
        if 'is_private' in data:
            user.is_private = data['is_private']
        if 'theme' in data:
            user.theme = data['theme']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        user = User.query.get_or_404(user_id)
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<int:user_id>/posts', methods=['GET'])
def get_user_posts(user_id):
    try:
        user = User.query.get_or_404(user_id)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        posts = Post.query.filter_by(user_id=user_id).order_by(
            Post.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'posts': [post.to_dict() for post in posts.items],
            'total': posts.total,
            'pages': posts.pages,
            'current_page': page,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<int:user_id>/follow', methods=['POST'])
@login_required
def follow_user(user_id):
    try:
        current_user_id = get_current_user_id()
        
        if current_user_id == user_id:
            return jsonify({'error': 'Cannot follow yourself'}), 400
        
        current_user = User.query.get_or_404(current_user_id)
        user_to_follow = User.query.get_or_404(user_id)
        
        if current_user.is_following(user_to_follow):
            return jsonify({'error': 'Already following this user'}), 400
        
        current_user.follow(user_to_follow)
        db.session.commit()
        
        return jsonify({
            'message': f'You are now following {user_to_follow.username}',
            'is_following': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<int:user_id>/follow', methods=['DELETE'])
@login_required
def unfollow_user(user_id):
    try:
        current_user_id = get_current_user_id()
        
        current_user = User.query.get_or_404(current_user_id)
        user_to_unfollow = User.query.get_or_404(user_id)
        
        if not current_user.is_following(user_to_unfollow):
            return jsonify({'error': 'Not following this user'}), 400
        
        current_user.unfollow(user_to_unfollow)
        db.session.commit()
        
        return jsonify({
            'message': f'You unfollowed {user_to_unfollow.username}',
            'is_following': False
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@users_bp.route('/search', methods=['GET'])
def search_users():
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'users': []}), 200
        
        users = User.query.filter(
            User.username.contains(query)
        ).limit(20).all()
        
        return jsonify({
            'users': [user.to_dict() for user in users],
            'query': query
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users/<username>', methods=['GET'])
@login_required
def get_user_by_username(username):
    """Get a specific user's profile"""
    try:
        current_user_id = get_current_user_id()
        
        # Find the user by username
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if current user is following this user
        is_following = False
        if current_user_id != user.id:
            follow = Follow.query.filter_by(
                follower_id=current_user_id,
                following_id=user.id
            ).first()
            is_following = follow is not None
        
        # Get user stats
        followers_count = Follow.query.filter_by(following_id=user.id).count()
        following_count = Follow.query.filter_by(follower_id=user.id).count()
        posts_count = Post.query.filter_by(user_id=user.id).count()
        
        user_data = user.to_dict()
        user_data.update({
            'followers_count': followers_count,
            'following_count': following_count,
            'posts_count': posts_count
        })
        
        return jsonify({
            'user': user_data,
            'is_following': is_following
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users/<username>/posts', methods=['GET'])
@login_required
def get_user_posts_by_username(username):
    """Get posts by a specific user"""
    try:
        # Find the user by username
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's posts
        posts = Post.query.filter_by(user_id=user.id)\
                         .order_by(Post.created_at.desc())\
                         .all()
        
        posts_data = []
        for post in posts:
            post_data = post.to_dict()
            post_data['author'] = user.to_dict()
            posts_data.append(post_data)
        
        return jsonify({'posts': posts_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users/<username>/follow', methods=['POST'])
@login_required
def toggle_follow_user(username):
    """Follow or unfollow a user"""
    try:
        current_user_id = get_current_user_id()
        
        # Find the user to follow/unfollow
        user_to_follow = User.query.filter_by(username=username).first()
        if not user_to_follow:
            return jsonify({'error': 'User not found'}), 404
        
        # Can't follow yourself
        if current_user_id == user_to_follow.id:
            return jsonify({'error': 'You cannot follow yourself'}), 400
        
        # Check if already following
        existing_follow = Follow.query.filter_by(
            follower_id=current_user_id,
            following_id=user_to_follow.id
        ).first()
        
        if existing_follow:
            # Unfollow
            db.session.delete(existing_follow)
            is_following = False
            message = f'You are no longer following {username}'
        else:
            # Follow
            new_follow = Follow(
                follower_id=current_user_id,
                following_id=user_to_follow.id
            )
            db.session.add(new_follow)
            is_following = True
            message = f'You are now following {username}'
        
        db.session.commit()
        
        return jsonify({
            'is_following': is_following,
            'message': message
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
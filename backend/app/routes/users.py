from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import User, Post, Follow, Comment
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
        
        # Update username if provided and different
        if 'username' in data and data['username'] != user.username:
            new_username = data['username'].strip()
            if not new_username:
                return jsonify({'error': 'Username cannot be empty'}), 400
            
            # Check if username is already taken
            existing_user = User.query.filter_by(username=new_username).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Username already taken'}), 400
            
            # Validate username format
            import re
            if not re.match(r'^[a-zA-Z0-9_]+$', new_username):
                return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400
            if len(new_username) < 3 or len(new_username) > 20:
                return jsonify({'error': 'Username must be between 3 and 20 characters'}), 400
            
            user.username = new_username
        
        # Update email if provided and different
        if 'email' in data and data['email'] != user.email:
            new_email = data['email'].strip().lower()
            if not new_email:
                return jsonify({'error': 'Email cannot be empty'}), 400
            
            # Check if email is already taken
            existing_user = User.query.filter_by(email=new_email).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Email already taken'}), 400
            
            # Basic email validation
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, new_email):
                return jsonify({'error': 'Invalid email format'}), 400
            
            user.email = new_email
        
        # Update other allowed fields
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


@users_bp.route('/users/search', methods=['GET'])
def search_users():
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'users': []}), 200
        
        users = User.query.filter(
            User.username.contains(query)
        ).limit(20).all()
        
        # Return user data without follower counts to avoid authentication issues
        user_data = []
        for user in users:
            user_data.append({
                'id': user.id,
                'username': user.username,
                'profile_pic': user.profile_pic or 'default.jpg',
                'bio': user.bio or ''
            })
        
        return jsonify({
            'users': user_data,
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
            # Add is_liked for current user
            current_user = User.query.get(get_current_user_id())
            post_data['is_liked'] = post.is_liked_by(current_user) if current_user else False
            # Add comments for this post
            comments = Comment.query.filter_by(post_id=post.id)\
                                   .order_by(Comment.created_at.asc())\
                                   .options(db.joinedload(Comment.author))\
                                   .all()
            post_data['comments_list'] = [comment.to_dict() for comment in comments]
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


@users_bp.route('/followers', methods=['GET'])
@login_required
def get_followers():
    try:
        # Check if a specific user ID is requested
        user_id_param = request.args.get('user_id')
        if user_id_param:
            try:
                user_id = int(user_id_param)
            except ValueError:
                return jsonify({'error': 'Invalid user ID'}), 400
        else:
            user_id = get_current_user_id()
        
        # Get users who are following the specified user
        followers = User.query.join(Follow, Follow.follower_id == User.id)\
            .filter(Follow.following_id == user_id)\
            .all()
        
        followers_data = [follower.to_dict() for follower in followers]
        
        return jsonify({'followers': followers_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/following', methods=['GET'])
@login_required
def get_following():
    try:
        # Check if a specific user ID is requested
        user_id_param = request.args.get('user_id')
        if user_id_param:
            try:
                user_id = int(user_id_param)
            except ValueError:
                return jsonify({'error': 'Invalid user ID'}), 400
        else:
            user_id = get_current_user_id()
        
        # Get users that the specified user is following
        following = User.query.join(Follow, Follow.following_id == User.id)\
            .filter(Follow.follower_id == user_id)\
            .all()
        
        following_data = [user.to_dict() for user in following]
        
        return jsonify({'following': following_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
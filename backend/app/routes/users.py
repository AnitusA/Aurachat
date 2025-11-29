from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Post

users_bp = Blueprint('users', __name__)

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_current_user_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get_or_404(user_id)
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        # Update allowed fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'bio' in data:
            user.bio = data['bio']
        if 'profile_picture' in data:
            user.profile_picture = data['profile_picture']
        
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
@jwt_required()
def follow_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        
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
@jwt_required()
def unfollow_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        
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
            User.username.contains(query) | 
            User.full_name.contains(query)
        ).limit(20).all()
        
        return jsonify({
            'users': [user.to_dict() for user in users],
            'query': query
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
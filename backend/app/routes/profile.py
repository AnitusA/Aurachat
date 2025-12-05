from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import User
from datetime import datetime

profile_bp = Blueprint('profile', __name__)

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


@profile_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get current user's profile - data from user table only"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profile_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile - updates user table only"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
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
        return jsonify({'error': f'Profile update failed: {str(e)}'}), 500


@profile_bp.route('/profile/theme', methods=['PUT'])
@login_required
def update_theme():
    """Update user's theme preference"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        theme = data.get('theme')
        
        if theme not in ['light', 'dark']:
            return jsonify({'error': 'Theme must be either light or dark'}), 400
        
        user.theme = theme
        db.session.commit()
        
        return jsonify({
            'message': 'Theme updated successfully',
            'theme': theme
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Theme update failed: {str(e)}'}), 500


@profile_bp.route('/profile/settings', methods=['GET'])
@login_required
def get_settings():
    """Get user settings from user table"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        settings = {
            'theme': user.theme or 'light',
            'is_private': user.is_private or False
        }
        
        return jsonify({'settings': settings}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@profile_bp.route('/profile/settings', methods=['PUT'])
@login_required
def update_settings():
    """Update user settings in user table"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if 'theme' in data:
            if data['theme'] not in ['light', 'dark']:
                return jsonify({'error': 'Invalid theme value'}), 400
            user.theme = data['theme']
        
        if 'is_private' in data:
            user.is_private = data['is_private']
        
        db.session.commit()
        
        return jsonify({'message': 'Settings updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Settings update failed: {str(e)}'}), 500


@profile_bp.route('/profile/comprehensive', methods=['PUT'])
@login_required
def update_comprehensive_profile():
    """Update user profile - all customizable fields in user table"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update user table fields
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
            'profile': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Profile update failed: {str(e)}'}), 500


@profile_bp.route('/profile/detailed', methods=['GET'])
@login_required
def get_detailed_profile():
    """Get user profile with all fields from user table"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
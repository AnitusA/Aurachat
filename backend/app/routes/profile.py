from flask import Blueprint, request, jsonify, session, current_app
from functools import wraps
from app import db
from app.models import User
from datetime import datetime
import os
import time
from werkzeug.utils import secure_filename

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
        
        # Update other allowed fields in user table
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
        
        # Update user table fields (only update known columns)
        if 'email' in data:
            # basic email validation
            import re
            if not re.match(r'^[^@]+@[^@]+\.[^@]+$', data['email']):
                return jsonify({'error': 'Invalid email format'}), 400
            user.email = data['email']

        if 'bio' in data:
            user.bio = data['bio']
        if 'profile_pic' in data:
            user.profile_pic = data['profile_pic']

        # Accept both explicit boolean and privacy_settings map from frontend
        if 'is_private' in data:
            user.is_private = data['is_private']
        elif 'privacy_settings' in data and isinstance(data['privacy_settings'], dict):
            # map profile_visibility -> is_private
            profile_vis = data['privacy_settings'].get('profile_visibility')
            if profile_vis == 'private':
                user.is_private = True
            elif profile_vis == 'public':
                user.is_private = False

        # Theme can be provided as 'theme' or 'theme_preference'
        theme_val = data.get('theme') or data.get('theme_preference')
        if theme_val:
            if theme_val not in ['light', 'dark']:
                return jsonify({'error': 'Invalid theme value'}), 400
            user.theme = theme_val
        
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


@profile_bp.route('/profile/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """Upload avatar image file and store as base64 data-URI in profile_pic column."""
    import traceback
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if 'avatar' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Validate mime type
        allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
        if file.mimetype not in allowed:
            return jsonify({'error': 'Unsupported file type'}), 400
        
        # Read binary data
        data = file.read()

        # Enforce size limit (5MB)
        max_bytes = 5 * 1024 * 1024
        if len(data) > max_bytes:
            return jsonify({'error': 'File too large (max 5MB)'}), 400

        # Store the image as a base64 data-URI in the profile_pic column
        import base64
        b64 = base64.b64encode(data).decode('ascii')
        data_uri = f"data:{file.mimetype};base64,{b64}"

        # Before overwriting, if previous profile_pic pointed to a local static file, remove it
        try:
            old_pic = (user.profile_pic or '')
            if old_pic.startswith('/static/uploads/avatars/'):
                upload_root = current_app.config.get('UPLOAD_FOLDER', 'static/uploads')
                old_filename = os.path.basename(old_pic)
                old_path = os.path.join(current_app.root_path, upload_root, 'avatars', old_filename)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception:
                        pass
        except Exception:
            pass

        # Save new data-uri into profile_pic
        user.profile_pic = data_uri
        db.session.commit()

        return jsonify({'message': 'Avatar uploaded successfully', 'profile_pic': data_uri}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Avatar upload error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Avatar upload failed: {str(e)}'}), 500



@profile_bp.route('/profile/avatar/<int:user_id>', methods=['GET'])
def serve_avatar(user_id):
    """Serve avatar - returns profile_pic URL/data-URI"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.profile_pic:
            return jsonify({'profile_pic': user.profile_pic}), 200

        return jsonify({'error': 'No avatar stored'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
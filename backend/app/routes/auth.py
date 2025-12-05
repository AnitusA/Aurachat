from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import User
import re

auth_bp = Blueprint('auth', __name__)

# Login required decorator (replaces @jwt_required)
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Helper to get current user id
def get_current_user_id():
    return session.get('user_id')


@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """User registration endpoint - stores data in user table"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        # Validate username format
        if not re.match(r'^[a-zA-Z0-9_]+$', data['username']):
            return jsonify({'message': 'Username can only contain letters, numbers, and underscores'}), 400
        
        if len(data['username']) < 3 or len(data['username']) > 20:
            return jsonify({'message': 'Username must be between 3 and 20 characters'}), 400
        
        # Validate email format
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', data['email']):
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Validate password strength
        if len(data['password']) < 6:
            return jsonify({'message': 'Password must be at least 6 characters long'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user:
            return jsonify({'message': 'Username already taken'}), 409
        
        existing_email = User.query.filter_by(email=data['email']).first()
        if existing_email:
            return jsonify({'message': 'Email already registered'}), 409
        
        # Create new user - all data stored in user table
        user = User(
            username=data['username'],
            email=data['email'],
            bio=data.get('bio', ''),
            theme=data.get('theme', 'light')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Store user_id in session
        session['user_id'] = user.id
        session.permanent = True
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'message': 'Username and password are required'}), 400
        
        # Find user by username
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            # Store user_id in session
            session['user_id'] = user.id
            session.permanent = True
            
            return jsonify({
                'message': 'Login successful',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'message': 'Invalid username or password'}), 401
            
    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user information"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    try:
        session.clear()
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password"""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        # Update password
        user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Password change failed: {str(e)}'}), 500
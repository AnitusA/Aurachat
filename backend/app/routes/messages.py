from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import User, Message
from datetime import datetime

messages_bp = Blueprint('messages', __name__)

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user_id():
    return session.get('user_id')

@messages_bp.route('/messages/conversations', methods=['GET'])
@login_required
def get_conversations():
    """Get all conversations for the current user"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get all users who have messaged with the current user
        sent_to = db.session.query(Message.receiver_id).filter_by(sender_id=user_id).distinct()
        received_from = db.session.query(Message.sender_id).filter_by(receiver_id=user_id).distinct()

        # Combine and get unique user IDs
        user_ids = set()
        for result in sent_to:
            user_ids.add(result[0])
        for result in received_from:
            user_ids.add(result[0])

        conversations = []
        for other_user_id in user_ids:
            other_user = User.query.get(other_user_id)
            if other_user:
                # Get the latest message between these users
                latest_message = Message.query.filter(
                    ((Message.sender_id == user_id) & (Message.receiver_id == other_user_id)) |
                    ((Message.sender_id == other_user_id) & (Message.receiver_id == user_id))
                ).order_by(Message.created_at.desc()).first()

                # Count unread messages from this user
                unread_count = Message.query.filter_by(
                    sender_id=other_user_id,
                    receiver_id=user_id,
                    is_read=False
                ).count()

                conversations.append({
                    'user': other_user.to_dict(),
                    'latest_message': latest_message.to_dict() if latest_message else None,
                    'unread_count': unread_count
                })

        # Sort by latest message time
        conversations.sort(key=lambda x: x['latest_message']['created_at'] if x['latest_message'] else '1970-01-01T00:00:00Z', reverse=True)

        return jsonify({'conversations': conversations}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/messages/<int:user_id>', methods=['GET'])
@login_required
def get_messages(user_id):
    """Get all messages between current user and specified user"""
    try:
        current_user_id = get_current_user_id()
        current_user = User.query.get(current_user_id)
        other_user = User.query.get(user_id)

        if not current_user or not other_user:
            return jsonify({'error': 'User not found'}), 404

        # Get all messages between these users
        messages = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.receiver_id == current_user_id))
        ).order_by(Message.created_at.asc()).all()

        # Mark messages from the other user as read
        Message.query.filter_by(
            sender_id=user_id,
            receiver_id=current_user_id,
            is_read=False
        ).update({'is_read': True})
        db.session.commit()

        return jsonify({
            'messages': [message.to_dict() for message in messages],
            'other_user': other_user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/messages', methods=['POST'])
@login_required
def send_message():
    """Send a message to another user"""
    try:
        current_user_id = get_current_user_id()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data.get('receiver_id') or not data.get('content'):
            return jsonify({'error': 'Receiver ID and content are required'}), 400

        receiver_id = data['receiver_id']
        content = data['content'].strip()

        if not content:
            return jsonify({'error': 'Message content cannot be empty'}), 400

        receiver = User.query.get(receiver_id)
        if not receiver:
            return jsonify({'error': 'Receiver not found'}), 404

        # Don't allow sending messages to yourself
        if receiver_id == current_user_id:
            return jsonify({'error': 'Cannot send messages to yourself'}), 400

        message = Message(
            content=content,
            sender_id=current_user_id,
            receiver_id=receiver_id
        )

        db.session.add(message)
        db.session.commit()

        return jsonify({
            'message': 'Message sent successfully',
            'message_data': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/messages/<int:message_id>/read', methods=['PUT'])
@login_required
def mark_message_read(message_id):
    """Mark a specific message as read"""
    try:
        current_user_id = get_current_user_id()
        message = Message.query.get(message_id)

        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Only the receiver can mark a message as read
        if message.receiver_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        message.is_read = True
        db.session.commit()

        return jsonify({'message': 'Message marked as read'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
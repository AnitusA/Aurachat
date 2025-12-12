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
        sent_to = db.session.query(Message.recipient_id).filter_by(sender_id=user_id).distinct()
        received_from = db.session.query(Message.sender_id).filter_by(recipient_id=user_id).distinct()

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
                    ((Message.sender_id == user_id) & (Message.recipient_id == other_user_id)) |
                    ((Message.sender_id == other_user_id) & (Message.recipient_id == user_id))
                ).order_by(Message.created_at.desc()).first()

                # Count unread messages from this user
                unread_count = Message.query.filter_by(
                    sender_id=other_user_id,
                    recipient_id=user_id,
                    is_read=False
                ).count()

                conversations.append({
                    'user': {
                        'id': other_user.id,
                        'username': other_user.username,
                        'profile_pic': other_user.profile_pic or 'default.jpg'
                    },
                    'latest_message': latest_message.to_dict() if latest_message else None,
                    'unread_count': unread_count
                })

        # Sort by latest message time
        conversations.sort(key=lambda x: x['latest_message']['created_at'] if x['latest_message'] else '1970-01-01T00:00:00Z', reverse=True)

        return jsonify({'conversations': conversations}), 200

    except Exception as e:
        print(f"Error in get_conversations: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

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
            ((Message.sender_id == current_user_id) & (Message.recipient_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.recipient_id == current_user_id))
        ).order_by(Message.created_at.asc()).all()

        # Mark messages from the other user as read
        Message.query.filter_by(
            sender_id=user_id,
            recipient_id=current_user_id,
            is_read=False
        ).update({'is_read': True})
        db.session.commit()

        return jsonify({
            'messages': [message.to_dict() for message in messages],
            'other_user': {
                'id': other_user.id,
                'username': other_user.username,
                'profile_pic': other_user.profile_pic or 'default.jpg'
            }
        }), 200

    except Exception as e:
        print(f"Error in get_messages: {e}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@messages_bp.route('/messages', methods=['POST'])
@login_required
def send_message():
    """Send a message to another user (text, image, or audio)"""
    try:
        current_user_id = get_current_user_id()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data.get('receiver_id'):
            return jsonify({'error': 'Receiver ID is required'}), 400

        recipient_id = data['receiver_id']
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        media_url = data.get('media_url')
        media_path = data.get('media_path')
        delete_after_24h = data.get('delete_after_24h', False)
        delete_after_viewing = data.get('delete_after_viewing', False)

        # Validate message content
        if message_type == 'text' and not content:
            return jsonify({'error': 'Message content cannot be empty'}), 400
        
        if message_type in ['image', 'audio'] and not media_url:
            return jsonify({'error': 'Media URL is required for media messages'}), 400

        receiver = User.query.get(recipient_id)
        if not receiver:
            return jsonify({'error': 'Receiver not found'}), 404

        # Don't allow sending messages to yourself
        if recipient_id == current_user_id:
            return jsonify({'error': 'Cannot send messages to yourself'}), 400

        # Calculate expiry time if delete_after_24h is enabled
        expires_at = None
        if delete_after_24h:
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(hours=24)

        message = Message(
            content=content if content else None,
            message_type=message_type,
            media_url=media_url,
            media_path=media_path,
            sender_id=current_user_id,
            recipient_id=recipient_id,
            delete_after_24h=delete_after_24h,
            delete_after_viewing=delete_after_viewing,
            expires_at=expires_at
        )

        db.session.add(message)
        db.session.commit()

        return jsonify({
            'message': 'Message sent successfully',
            'message_data': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {e}")
        import traceback
        traceback.print_exc()
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
        if message.recipient_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Mark as read
        message.is_read = True
        db.session.commit()
        
        return jsonify({'message': 'Message marked as read'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error marking message as read: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/messages/shared-media/<int:user_id>', methods=['GET'])
@login_required
def get_shared_media(user_id):
    """Get shared media (images/audio) between current user and specified user from last 24 hours"""
    try:
        current_user_id = get_current_user_id()
        
        # Calculate 24 hours ago
        from datetime import timedelta
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        
        # Get all media messages between these users from last 24 hours
        media_messages = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.recipient_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.recipient_id == current_user_id)),
            Message.message_type.in_(['image', 'audio']),
            Message.created_at >= twenty_four_hours_ago
        ).order_by(Message.created_at.desc()).all()

        return jsonify({
            'media': [msg.to_dict() for msg in media_messages]
        }), 200

    except Exception as e:
        print(f"Error in get_shared_media: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@messages_bp.route('/messages/cleanup-expired', methods=['POST'])
@login_required
def cleanup_expired_messages():
    """Delete messages that have expired (past 24h with delete_after_24h enabled)"""
    try:
        # Find all expired messages
        expired_messages = Message.query.filter(
            Message.delete_after_24h == True,
            Message.expires_at <= datetime.utcnow()
        ).all()
        
        media_paths = [msg.media_path for msg in expired_messages if msg.media_path]
        
        for message in expired_messages:
            db.session.delete(message)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Deleted {len(expired_messages)} expired messages',
            'count': len(expired_messages),
            'media_paths': media_paths  # Return paths for frontend to delete from Supabase
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in cleanup_expired_messages: {e}")
        return jsonify({'error': str(e)}), 500
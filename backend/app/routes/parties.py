from flask import Blueprint, request, jsonify, session
from functools import wraps
from app import db
from app.models import User, Party, PartyMessage, PartyJoinRequest
from sqlalchemy.orm import joinedload
import re

parties_bp = Blueprint('parties', __name__)

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

def extract_youtube_video_id(url):
    """Extract YouTube video ID from various URL formats including Shorts"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})',  # YouTube Shorts support
        r'youtu\.be\/shorts\/([a-zA-Z0-9_-]{11})'      # Short URL Shorts support
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

@parties_bp.route('/parties', methods=['GET'])
@login_required
def get_parties():
    """Get all active parties"""
    try:
        parties = Party.query.options(joinedload(Party.members)).filter_by(is_active=True).all()
        return jsonify({
            'parties': [party.to_dict() for party in parties]
        }), 200
    except Exception as e:
        print(f'Error fetching parties: {e}')
        return jsonify({'error': 'Failed to fetch parties'}), 500

@parties_bp.route('/parties/my', methods=['GET'])
@login_required
def get_my_parties():
    """Get parties created by or joined by current user"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get all parties where user is a member (includes parties they created and joined)
        my_parties = Party.query.options(joinedload(Party.members)).filter(
            Party.is_active == True,
            Party.members.any(id=user_id)
        ).all()
        
        print(f'User {user_id} has {len(my_parties)} parties')
        
        return jsonify({
            'parties': [party.to_dict() for party in my_parties]
        }), 200
    except Exception as e:
        print(f'Error fetching my parties: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch my parties'}), 500

@parties_bp.route('/parties/<int:party_id>/messages', methods=['GET'])
@login_required
def get_party_messages(party_id):
    """Get chat messages for a party"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        party = Party.query.get(party_id)
        
        if not party:
            return jsonify({'error': 'Party not found'}), 404
        
        if user not in party.members:
            return jsonify({'error': 'Not a member of this party'}), 403
        
        # Get last 100 messages
        messages = PartyMessage.query.filter_by(party_id=party_id)\
            .order_by(PartyMessage.created_at.desc())\
            .limit(100)\
            .all()
        
        # Return in chronological order
        messages.reverse()
        
        return jsonify({
            'messages': [msg.to_dict() for msg in messages]
        }), 200
    except Exception as e:
        print(f'Error fetching party messages: {e}')
        return jsonify({'error': 'Failed to fetch messages'}), 500

@parties_bp.route('/parties', methods=['POST'])
@login_required
def create_party():
    """Create a new party"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()

        if not data.get('name') or not data.get('youtube_url'):
            return jsonify({'error': 'Party name and YouTube URL are required'}), 400

        party_name = data['name'].strip()
        party_type = data.get('type', 'private')
        youtube_url = data['youtube_url'].strip()

        if len(party_name) < 3 or len(party_name) > 100:
            return jsonify({'error': 'Party name must be between 3 and 100 characters'}), 400

        if party_type not in ['private', 'public']:
            return jsonify({'error': 'Party type must be either private or public'}), 400

        # Validate YouTube URL
        video_id = extract_youtube_video_id(youtube_url)
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400

        # Create party
        party = Party(
            name=party_name,
            type=party_type,
            youtube_url=youtube_url,
            admin_id=user_id
        )

        # Add creator as first member
        party.members.append(user)

        db.session.add(party)
        db.session.commit()

        return jsonify({
            'message': 'Party created successfully',
            'party': party.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f'Error creating party: {e}')
        return jsonify({'error': 'Failed to create party'}), 500
@parties_bp.route('/parties/<int:party_id>/messages', methods=['POST'])
@login_required
def post_party_message(party_id):
    """Post a message to party chat"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        party = Party.query.get(party_id)
        
        if not party:
            return jsonify({'error': 'Party not found'}), 404
        
        if user not in party.members:
            return jsonify({'error': 'Not a member of this party'}), 403
        
        data = request.get_json()
        message_content = data.get('message', '').strip()
        
        if not message_content:
            return jsonify({'error': 'Message content required'}), 400
        
        # Save message to database
        message = PartyMessage(
            party_id=party_id,
            user_id=user_id,
            content=message_content
        )
        
        db.session.add(message)
        db.session.commit()
        
        # Broadcast to all party members via socket
        from app import socketio
        message_data = {
            'id': message.id,
            'party_id': party_id,
            'message': message_content,
            'user_id': user_id,
            'username': user.username,
            'profile_pic': user.profile_pic or 'default.jpg',
            'timestamp': message.created_at.isoformat() + 'Z' if message.created_at else None
        }
        
        socketio.emit('party_message', message_data, room=str(party_id))
        
        return jsonify({
            'message': 'Message sent successfully',
            'message_data': message_data
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f'Error posting party message: {e}')
        return jsonify({'error': 'Failed to post message'}), 500
@parties_bp.route('/parties/<int:party_id>/join', methods=['POST'])
@login_required
def join_party(party_id):
    """Join a party"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        party = Party.query.get(party_id)

        if not user or not party:
            return jsonify({'error': 'User or party not found'}), 404

        if not party.is_active:
            return jsonify({'error': 'Party is no longer active'}), 400

        # Check if user is already a member
        if user in party.members:
            # User is already a member, just return success
            return jsonify({
                'message': 'Already a member of this party',
                'party': party.to_dict()
            }), 200

        # For private parties, only allow if user is the creator or has been approved
        if party.type == 'private' and user_id != party.admin_id:
            return jsonify({'error': 'This is a private party. Only the admin can add members.'}), 403

        # For public parties, anyone can join
        party.members.append(user)
        db.session.commit()

        # Notify other members via socket
        from app import socketio
        socketio.emit('party_joined', {
            'party_id': party_id,
            'user_id': user_id,
            'members': [member.to_dict() for member in party.members]
        }, room=str(party_id))

        return jsonify({
            'message': 'Joined party successfully',
            'party': party.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f'Error joining party: {e}')
        return jsonify({'error': 'Failed to join party'}), 500

@parties_bp.route('/parties/<int:party_id>/leave', methods=['POST'])
@login_required
def leave_party(party_id):
    """Leave a party"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        party = Party.query.get(party_id)

        if not user or not party:
            return jsonify({'error': 'User or party not found'}), 404

        if user not in party.members:
            return jsonify({'error': 'Not a member of this party'}), 400

        # If user is admin and there are other members, transfer admin to another member
        if party.admin_id == user_id and len(party.members) > 1:
            # Find another member to be admin
            other_members = [m for m in party.members if m.id != user_id]
            if other_members:
                party.admin_id = other_members[0].id

        # If no members left, deactivate party
        if len(party.members) <= 1:
            party.is_active = False
        else:
            party.members.remove(user)

        db.session.commit()

        # Notify other members via socket
        from app import socketio
        socketio.emit('party_left', {
            'party_id': party_id,
            'user_id': user_id
        }, room=str(party_id))

        return jsonify({'message': 'Left party successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f'Error leaving party: {e}')
        return jsonify({'error': 'Failed to leave party'}), 500

@parties_bp.route('/parties/<int:party_id>/kick', methods=['POST'])
@login_required
def kick_user(party_id):
    """Kick a user from party (admin only)"""
    try:
        user_id = get_current_user_id()
        party = Party.query.get(party_id)

        if not party:
            return jsonify({'error': 'Party not found'}), 404

        if party.admin_id != user_id:
            return jsonify({'error': 'Only party admin can kick users'}), 403

        data = request.get_json()
        target_user_id = data.get('user_id')

        if not target_user_id:
            return jsonify({'error': 'Target user ID required'}), 400

        if target_user_id == user_id:
            return jsonify({'error': 'Cannot kick yourself'}), 400

        target_user = User.query.get(target_user_id)
        if not target_user or target_user not in party.members:
            return jsonify({'error': 'User not found in party'}), 404

        party.members.remove(target_user)
        db.session.commit()

        # Notify members via socket
        from app import socketio
        socketio.emit('user_kicked', {
            'party_id': party_id,
            'user_id': target_user_id,
            'kicked_by': user_id
        }, room=str(party_id))

        return jsonify({'message': 'User kicked successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f'Error kicking user: {e}')
        return jsonify({'error': 'Failed to kick user'}), 500

@parties_bp.route('/parties/<int:party_id>', methods=['DELETE'])
@login_required
def delete_party(party_id):
    """Delete a party and all its messages (admin only)"""
    try:
        user_id = get_current_user_id()
        party = Party.query.get(party_id)

        if not party:
            return jsonify({'error': 'Party not found'}), 404

        if party.admin_id != user_id:
            return jsonify({'error': 'Only party admin can delete the party'}), 403

        # Notify members via socket before deleting
        from app import socketio
        socketio.emit('party_deleted', {
            'party_id': party_id,
            'deleted_by': user_id
        }, room=f'party_{party_id}')

        # Delete all party messages first
        PartyMessage.query.filter_by(party_id=party_id).delete()
        
        # Delete all join requests
        PartyJoinRequest.query.filter_by(party_id=party_id).delete()
        
        # Remove all members and delete the party
        party.members.clear()
        db.session.delete(party)
        db.session.commit()

        return jsonify({'message': 'Party and all messages deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f'Error deleting party: {e}')
        return jsonify({'error': 'Failed to delete party'}), 500

@parties_bp.route('/parties/<int:party_id>/requests', methods=['GET'])
@login_required
def get_join_requests(party_id):
    """Get pending join requests for a party (admin only)"""
    try:
        user_id = get_current_user_id()
        party = Party.query.get(party_id)

        if not party:
            return jsonify({'error': 'Party not found'}), 404

        if party.admin_id != user_id:
            return jsonify({'error': 'Only party admin can view join requests'}), 403

        requests = PartyJoinRequest.query.filter_by(party_id=party_id, status='pending').all()
        
        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200

    except Exception as e:
        print(f'Error fetching join requests: {e}')
        return jsonify({'error': 'Failed to fetch join requests'}), 500

@parties_bp.route('/parties/<int:party_id>/requests/<int:request_id>', methods=['POST'])
@login_required
def handle_join_request(party_id, request_id):
    """Approve or reject a join request (admin only)"""
    try:
        user_id = get_current_user_id()
        party = Party.query.get(party_id)

        if not party:
            return jsonify({'error': 'Party not found'}), 404

        if party.admin_id != user_id:
            return jsonify({'error': 'Only party admin can handle join requests'}), 403

        join_request = PartyJoinRequest.query.get(request_id)
        if not join_request or join_request.party_id != party_id:
            return jsonify({'error': 'Join request not found'}), 404

        data = request.get_json()
        action = data.get('action')  # 'approve' or 'reject'

        if action not in ['approve', 'reject']:
            return jsonify({'error': 'Invalid action'}), 400

        if action == 'approve':
            join_request.status = 'approved'
            # Add user to party members
            user_to_add = User.query.get(join_request.user_id)
            if user_to_add and user_to_add not in party.members:
                party.members.append(user_to_add)
                
                # Notify via socket
                from app import socketio
                socketio.emit('party_joined', {
                    'party_id': party_id,
                    'user_id': join_request.user_id,
                    'members': [member.to_dict() for member in party.members]
                }, room=str(party_id))
        else:
            join_request.status = 'rejected'

        db.session.commit()

        return jsonify({
            'message': f'Request {action}d successfully',
            'request': join_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f'Error handling join request: {e}')
        return jsonify({'error': 'Failed to handle join request'}), 500

@parties_bp.route('/parties/<int:party_id>/add-member', methods=['POST'])
@login_required
def add_member_to_party(party_id):
    """Admin adds a member directly to the party"""
    try:
        user_id = get_current_user_id()
        party = Party.query.get(party_id)

        if not party:
            return jsonify({'error': 'Party not found'}), 404

        if party.admin_id != user_id:
            return jsonify({'error': 'Only party admin can add members'}), 403

        data = request.get_json()
        member_user_id = data.get('user_id')

        if not member_user_id:
            return jsonify({'error': 'User ID required'}), 400

        member = User.query.get(member_user_id)
        if not member:
            return jsonify({'error': 'User not found'}), 404

        if member in party.members:
            return jsonify({'error': 'User is already a member'}), 400

        # Add member to party
        party.members.append(member)
        db.session.commit()

        # Notify via socket
        from app import socketio
        socketio.emit('party_joined', {
            'party_id': party_id,
            'user_id': member_user_id,
            'members': [m.to_dict() for m in party.members]
        }, room=str(party_id))

        return jsonify({
            'message': f'{member.username} added to party successfully',
            'party': party.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f'Error adding member: {e}')
        return jsonify({'error': 'Failed to add member'}), 500
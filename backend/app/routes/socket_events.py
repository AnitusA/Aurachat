from flask_socketio import emit, join_room, leave_room
from flask import request
from app import socketio, db
from app.models import User, Message, Party, PartyMessage
from datetime import datetime
import json

# Store connected users: {user_id: sid}
connected_users = {}

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)
    # Remove user from connected users
    for user_id, sid in list(connected_users.items()):
        if sid == request.sid:
            del connected_users[user_id]
            break

@socketio.on('join')
def handle_join(data):
    """User joins their personal room for receiving messages"""
    user_id = data.get('user_id')
    if user_id:
        join_room(str(user_id))
        connected_users[user_id] = request.sid
        print(f'User {user_id} joined room')
        emit('joined', {'status': 'success'})

@socketio.on('leave')
def handle_leave(data):
    """User leaves their personal room"""
    user_id = data.get('user_id')
    if user_id:
        leave_room(str(user_id))
        if user_id in connected_users:
            del connected_users[user_id]
        print(f'User {user_id} left room')

@socketio.on('send_message')
def handle_send_message(data):
    """Handle sending a message via WebSocket"""
    try:
        sender_id = data.get('sender_id')
        recipient_id = data.get('recipient_id')
        content = data.get('content', '').strip()

        if not all([sender_id, recipient_id, content]):
            emit('error', {'message': 'Missing required fields'})
            return

        # Verify sender exists
        sender = User.query.get(sender_id)
        if not sender:
            emit('error', {'message': 'Sender not found'})
            return

        # Verify recipient exists
        recipient = User.query.get(recipient_id)
        if not recipient:
            emit('error', {'message': 'Recipient not found'})
            return

        # Create message
        message = Message(
            content=content,
            sender_id=sender_id,
            recipient_id=recipient_id
        )

        db.session.add(message)
        db.session.commit()

        # Prepare message data
        message_data = message.to_dict()

        # Send to recipient if online
        emit('receive_message', {
            'message': message_data,
            'conversation_id': sender_id
        }, room=str(recipient_id))

        # Send confirmation to sender
        emit('message_sent', {
            'message': message_data,
            'recipient_id': recipient_id
        })

        print(f'Message sent from {sender_id} to {recipient_id}')

    except Exception as e:
        print(f'Error sending message: {e}')
        emit('error', {'message': 'Failed to send message'})

@socketio.on('mark_as_read')
def handle_mark_as_read(data):
    """Mark messages as read"""
    try:
        message_id = data.get('message_id')
        user_id = data.get('user_id')

        if not message_id or not user_id:
            emit('error', {'message': 'Missing required fields'})
            return

        message = Message.query.get(message_id)
        if not message:
            emit('error', {'message': 'Message not found'})
            return

        # Only recipient can mark as read
        if message.recipient_id != user_id:
            emit('error', {'message': 'Unauthorized'})
            return

        message.is_read = True
        db.session.commit()

        # Notify sender that message was read
        emit('message_read', {
            'message_id': message_id,
            'reader_id': user_id
        }, room=str(message.sender_id))

        print(f'Message {message_id} marked as read by {user_id}')

    except Exception as e:
        print(f'Error marking message as read: {e}')
        emit('error', {'message': 'Failed to mark message as read'})

@socketio.on('video_state_change')
def handle_video_state_change(data):
    """Handle video playback synchronization (admin only)"""
    try:
        party_id = data.get('party_id')
        state = data.get('state')  # YouTube player state
        current_time = data.get('current_time', 0)
        is_playing = data.get('is_playing', False)

        if not party_id:
            emit('error', {'message': 'Party ID required'})
            return

        # Broadcast video state to all party members
        emit('video_sync', {
            'party_id': party_id,
            'state': state,
            'current_time': current_time,
            'is_playing': is_playing
        }, room=f'party_{party_id}', include_self=False)

        print(f'Video state synced for party {party_id}: state={state}, time={current_time}s, playing={is_playing}')

    except Exception as e:
        print(f'Error syncing video state: {e}')
        emit('error', {'message': 'Failed to sync video'})

@socketio.on('admin_sync')
def handle_admin_sync(data):
    """Periodic sync from admin to all party members"""
    try:
        party_id = data.get('party_id')
        current_time = data.get('current_time', 0)
        is_playing = data.get('is_playing', False)

        if not party_id:
            return

        # Broadcast to all party members except admin
        emit('admin_sync', {
            'party_id': party_id,
            'current_time': current_time,
            'is_playing': is_playing
        }, room=f'party_{party_id}', include_self=False)

    except Exception as e:
        print(f'Error in admin sync: {e}')

@socketio.on('request_sync')
def handle_request_sync(data):
    """Non-admin requests sync from admin"""
    try:
        party_id = data.get('party_id')

        if not party_id:
            return

        # Notify admin to send current position
        emit('sync_requested', {
            'party_id': party_id
        }, room=f'party_{party_id}')

        print(f'Sync requested for party {party_id}')

    except Exception as e:
        print(f'Error handling sync request: {e}')

@socketio.on('join_party')
def handle_join_party(data):
    """User joins a party room"""
    try:
        party_id = data.get('party_id')
        user_id = data.get('user_id')

        if not party_id or not user_id:
            return

        # Join the party-specific room
        join_room(f'party_{party_id}')
        print(f'User {user_id} joined party room {party_id}')

        # Notify other members
        emit('member_joined', {
            'party_id': party_id,
            'user_id': user_id
        }, room=f'party_{party_id}', include_self=False)

    except Exception as e:
        print(f'Error joining party: {e}')

@socketio.on('leave_party')
def handle_leave_party(data):
    """User leaves a party room"""
    try:
        party_id = data.get('party_id')
        user_id = data.get('user_id')

        if not party_id or not user_id:
            return

        # Leave the party-specific room
        leave_room(f'party_{party_id}')
        print(f'User {user_id} left party room {party_id}')

        # Notify other members
        emit('member_left', {
            'party_id': party_id,
            'user_id': user_id
        }, room=f'party_{party_id}', include_self=False)

    except Exception as e:
        print(f'Error leaving party: {e}')

@socketio.on('party_message')
def handle_party_message(data):
    """Handle party chat messages"""
    try:
        party_id = data.get('party_id')
        message = data.get('message', '').strip()
        user_id = data.get('user_id')

        if not party_id or not message or not user_id:
            emit('error', {'message': 'Missing required fields'})
            return

        user = User.query.get(user_id)
        party = Party.query.get(party_id)

        if not user or not party:
            emit('error', {'message': 'User or party not found'})
            return

        if user not in party.members:
            emit('error', {'message': 'Not a member of this party'})
            return

        if len(message) > 500:
            emit('error', {'message': 'Message too long (max 500 characters)'})
            return

        # Save message to database
        party_message = PartyMessage(
            party_id=party_id,
            user_id=user_id,
            content=message
        )
        db.session.add(party_message)
        db.session.commit()

        # Broadcast message to all party members
        message_data = {
            'id': party_message.id,
            'party_id': party_id,
            'message': message,
            'user_id': user_id,
            'username': user.username,
            'profile_pic': user.profile_pic or 'default.jpg',
            'timestamp': party_message.created_at.isoformat() + 'Z'
        }

        emit('party_message', message_data, room=f'party_{party_id}')

        print(f'Party message in {party_id} from {user.username}: {message[:50]}...')

    except Exception as e:
        db.session.rollback()
        print(f'Error handling party message: {e}')
        emit('error', {'message': 'Failed to send party message'})

@socketio.on('party_reaction')
def handle_party_reaction(data):
    """Handle emoji reactions"""
    try:
        party_id = data.get('party_id')
        emoji = data.get('emoji')
        user_id = data.get('user_id')

        if not party_id or not emoji or not user_id:
            emit('error', {'message': 'Missing required fields'})
            return

        user = User.query.get(user_id)
        party = Party.query.get(party_id)

        if not user or not party:
            emit('error', {'message': 'User or party not found'})
            return

        if user not in party.members:
            emit('error', {'message': 'Not a member of this party'})
            return

        # Broadcast reaction to all party members
        reaction_data = {
            'party_id': party_id,
            'emoji': emoji,
            'user_id': user_id,
            'username': user.username,
            'timestamp': db.func.now().isoformat() + 'Z'
        }

        emit('party_reaction', reaction_data, room=f'party_{party_id}')

        print(f'Party reaction in {party_id} from {user.username}: {emoji}')

    except Exception as e:
        print(f'Error handling party reaction: {e}')
        emit('error', {'message': 'Failed to send reaction'})
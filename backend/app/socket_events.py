from flask import request
from flask_socketio import emit, join_room, leave_room
from app import socketio

# Store connected users
connected_users = {}

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    # Remove user from connected users
    user_id_to_remove = None
    for user_id, sid in connected_users.items():
        if sid == request.sid:
            user_id_to_remove = user_id
            break
    
    if user_id_to_remove:
        del connected_users[user_id_to_remove]
        print(f'User {user_id_to_remove} disconnected')

@socketio.on('register_user')
def handle_register_user(data):
    user_id = data.get('userId')
    if user_id:
        connected_users[user_id] = request.sid
        print(f'User registered: {user_id} with socket {request.sid}')

@socketio.on('call_user')
def handle_call_user(data):
    target_user_id = data.get('targetUserId')
    call_type = data.get('callType')
    caller = data.get('caller')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('incoming_call', {
            'caller': caller,
            'callType': call_type
        }, room=target_sid)
        print(f'{caller["username"]} calling {target_user_id}')

@socketio.on('call_accepted')
def handle_call_accepted(data):
    target_user_id = data.get('targetUserId')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('call_accepted', {}, room=target_sid)
        print(f'Call accepted by user')

@socketio.on('call_declined')
def handle_call_declined(data):
    target_user_id = data.get('targetUserId')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('call_declined', {}, room=target_sid)
        print(f'Call declined by user')

@socketio.on('call_ended')
def handle_call_ended(data):
    target_user_id = data.get('target')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('call_ended', {}, room=target_sid)
        print(f'Call ended')

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    target_user_id = data.get('target')
    offer = data.get('offer')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('webrtc_offer', {
            'offer': offer,
            'caller': request.sid
        }, room=target_sid)

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    target_user_id = data.get('target')
    answer = data.get('answer')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('webrtc_answer', {
            'answer': answer
        }, room=target_sid)

@socketio.on('ice_candidate')
def handle_ice_candidate(data):
    target_user_id = data.get('target')
    candidate = data.get('candidate')
    
    if target_user_id in connected_users:
        target_sid = connected_users[target_user_id]
        emit('ice_candidate', {
            'candidate': candidate
        }, room=target_sid)

@socketio.on('send_message')
def handle_send_message(data):
    """Handle real-time message delivery"""
    recipient_id = data.get('recipient_id')
    sender_id = data.get('sender', {}).get('id')
    
    print(f'Message from {sender_id} to {recipient_id}')
    print(f'Connected users: {connected_users}')
    
    # Send message to recipient if they're online
    if recipient_id in connected_users:
        recipient_sid = connected_users[recipient_id]
        emit('receive_message', data, room=recipient_sid)
        print(f'Message delivered to {recipient_id} at socket {recipient_sid}')
    else:
        print(f'Recipient {recipient_id} is not online')

@socketio.on('typing')
def handle_typing(data):
    """Handle typing indicator"""
    recipient_id = data.get('recipient_id')
    sender_username = data.get('sender_username')
    is_typing = data.get('is_typing', False)
    
    if recipient_id in connected_users:
        recipient_sid = connected_users[recipient_id]
        emit('user_typing', {
            'sender_username': sender_username,
            'is_typing': is_typing
        }, room=recipient_sid)
# Party-related socket events
@socketio.on('join_party')
def handle_join_party(data):
    """User joins a party room"""
    party_id = data.get('party_id')
    user_id = data.get('user_id')
    
    if party_id:
        join_room(str(party_id))
        print(f'User {user_id} joined party room {party_id}')

@socketio.on('leave_party')
def handle_leave_party(data):
    """User leaves a party room"""
    party_id = data.get('party_id')
    user_id = data.get('user_id')
    
    if party_id:
        leave_room(str(party_id))
        print(f'User {user_id} left party room {party_id}')

@socketio.on('admin_sync')
def handle_admin_sync(data):
    """Admin broadcasts video sync to all party members"""
    party_id = data.get('party_id')
    current_time = data.get('current_time')
    is_playing = data.get('is_playing')
    
    if party_id:
        # Broadcast to everyone in the party room except the sender
        emit('video_sync', {
            'current_time': current_time,
            'is_playing': is_playing
        }, room=str(party_id), include_self=False)
        print(f'Admin sync broadcast to party {party_id}: time={current_time}, playing={is_playing}')

@socketio.on('video_state_change')
def handle_video_state_change(data):
    """Admin's video state changed (play/pause/seek)"""
    party_id = data.get('party_id')
    state = data.get('state')
    current_time = data.get('current_time')
    is_playing = data.get('is_playing')
    
    if party_id:
        # Broadcast to everyone in the party room except the sender
        emit('video_sync', {
            'current_time': current_time,
            'is_playing': is_playing,
            'state': state
        }, room=str(party_id), include_self=False)
        print(f'Video state change in party {party_id}: state={state}, time={current_time}')

@socketio.on('request_sync')
def handle_request_sync(data):
    """Non-admin user requests video sync"""
    party_id = data.get('party_id')
    
    if party_id:
        # Notify admin to send sync
        emit('sync_requested', {
            'party_id': party_id
        }, room=str(party_id))
        print(f'Sync requested for party {party_id}')

@socketio.on('party_message')
def handle_party_message(data):
    """Handle party chat message"""
    party_id = data.get('party_id')
    
    if party_id:
        # Broadcast to everyone in the party room
        emit('party_message', data, room=str(party_id))
        print(f'Party message sent to party {party_id}')

@socketio.on('party_reaction')
def handle_party_reaction(data):
    """Handle emoji reaction in party"""
    party_id = data.get('party_id')
    
    if party_id:
        # Broadcast to everyone in the party room
        emit('party_reaction', data, room=str(party_id))
        print(f'Party reaction sent to party {party_id}')
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

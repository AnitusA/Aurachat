import React, { useRef, useEffect, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../contexts/SocketContext';
import './VideoCall.css';

const VideoCall = ({ isOpen, onClose, callType, remoteUserId, isInitiator }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const { socket } = useSocket();

  useEffect(() => {
    if (!isOpen || !socket) return;

    const initCall = async () => {
      try {
        // Get user media based on call type
        const constraints = {
          audio: true,
          video: callType === 'video' ? { width: 1280, height: 720 } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const peer = new Peer({
          initiator: isInitiator,
          trickle: false,
          stream: stream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        peerRef.current = peer;

        peer.on('signal', (data) => {
          if (data.type === 'offer') {
            socket.emit('webrtc_offer', {
              target: remoteUserId,
              offer: data
            });
          } else if (data.type === 'answer') {
            socket.emit('webrtc_answer', {
              target: remoteUserId,
              answer: data
            });
          }
        });

        peer.on('stream', (stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          setCallStatus('Connected');
        });

        peer.on('connect', () => {
          setCallStatus('Connected');
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setCallStatus('Connection error');
        });

        peer.on('close', () => {
          setCallStatus('Call ended');
          handleEndCall();
        });

        // Listen for WebRTC signaling
        socket.on('webrtc_offer', ({ offer, caller }) => {
          if (peerRef.current && !isInitiator) {
            peerRef.current.signal(offer);
          }
        });

        socket.on('webrtc_answer', ({ answer }) => {
          if (peerRef.current && isInitiator) {
            peerRef.current.signal(answer);
          }
        });

        socket.on('ice_candidate', ({ candidate }) => {
          if (peerRef.current) {
            peerRef.current.signal(candidate);
          }
        });

        socket.on('call_ended', () => {
          handleEndCall();
        });

      } catch (error) {
        console.error('Error accessing media devices:', error);
        setCallStatus('Failed to access camera/microphone');
      }
    };

    initCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      socket?.off('webrtc_offer');
      socket?.off('webrtc_answer');
      socket?.off('ice_candidate');
      socket?.off('call_ended');
    };
  }, [isOpen, socket, remoteUserId, isInitiator, callType]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socket) {
      socket.emit('call_ended', { target: remoteUserId });
    }
    setLocalStream(null);
    setRemoteStream(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        <div className="video-call-header">
          <h3>{callType === 'video' ? '📹 Video Call' : '🎤 Audio Call'}</h3>
          <span className="call-status">{callStatus}</span>
          <button className="close-btn" onClick={handleEndCall}>✕</button>
        </div>

        <div className="video-streams">
          <div className="remote-video-container">
            {callType === 'video' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
              />
            ) : (
              <div className="audio-call-avatar">
                <div className="avatar-circle">
                  <span className="avatar-icon">👤</span>
                </div>
                <p>Audio Call</p>
              </div>
            )}
            {!remoteStream && (
              <div className="waiting-overlay">
                <div className="spinner"></div>
                <p>Waiting for connection...</p>
              </div>
            )}
          </div>

          {callType === 'video' && (
            <div className="local-video-container">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="local-video"
              />
              {isVideoOff && (
                <div className="video-off-overlay">
                  <span>📷 Camera Off</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="video-call-controls">
          <button
            className={`control-btn ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          {callType === 'video' && (
            <button
              className={`control-btn ${isVideoOff ? 'active' : ''}`}
              onClick={toggleVideo}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? '📷❌' : '📹'}
            </button>
          )}

          <button
            className="control-btn end-call-btn"
            onClick={handleEndCall}
            title="End call"
          >
            📞 End Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;

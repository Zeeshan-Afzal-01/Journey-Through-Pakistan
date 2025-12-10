import React, { useEffect, useRef, useState } from 'react';
import { FiPhone, FiVideo, FiX } from 'react-icons/fi';
import '../assests/css/callModal.css';

export default function CallModal({ 
  isOpen, 
  onClose, 
  callType, 
  callerName, 
  callerAvatar,
  isIncoming = false,
  localStream,
  remoteStream,
  onAnswer,
  onReject,
  onEnd,
  isCallActive = false
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal-content">
        {callType === 'video' && isCallActive && (
          <div className="call-video-container">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="remote-video"
            />
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted
              className="local-video"
            />
          </div>
        )}

        {(!isCallActive || callType === 'voice') && (
          <div className="call-user-info">
            <div className="call-avatar">
              {callerAvatar ? (
                <img src={callerAvatar} alt={callerName} />
              ) : (
                <div className="call-avatar-placeholder">
                  {callerName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <h3 className="call-name">{callerName || 'Unknown'}</h3>
            <p className="call-status">
              {isIncoming ? 'Incoming call' : isCallActive ? 'Call in progress...' : 'Calling...'}
            </p>
          </div>
        )}

        <div className="call-controls">
          {isIncoming && !isCallActive && (
            <>
              <button className="call-btn call-btn-reject" onClick={onReject}>
                <FiX size={24} />
              </button>
              <button className="call-btn call-btn-answer" onClick={onAnswer}>
                {callType === 'video' ? <FiVideo size={24} /> : <FiPhone size={24} />}
              </button>
            </>
          )}

          {!isIncoming && !isCallActive && (
            <button className="call-btn call-btn-reject" onClick={onEnd}>
              <FiX size={24} />
            </button>
          )}

          {isCallActive && (
            <>
              {callType === 'video' && (
                <button 
                  className={`call-btn ${isVideoOff ? 'call-btn-off' : ''}`}
                  onClick={toggleVideo}
                  title={isVideoOff ? 'Turn on video' : 'Turn off video'}
                >
                  <FiVideo size={20} />
                </button>
              )}
              <button 
                className={`call-btn ${isMuted ? 'call-btn-off' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <FiPhone size={20} />
              </button>
              <button className="call-btn call-btn-end" onClick={onEnd}>
                <FiX size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


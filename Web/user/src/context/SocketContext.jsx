import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getCookie } from '../utils/cookies';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);
  const onlineUsersSetRef = useRef(new Set());
  const notificationSoundRef = useRef(null);
  const currentConversationIdRef = useRef(null);
  const lastSoundTimeRef = useRef({});

  // Create notification sound using Web Audio API
  useEffect(() => {
    const audioContextRef = { current: null };
    
    const createNotificationSound = () => {
      try {
        // Create or reuse audio context
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const audioContext = audioContextRef.current;
        
        // Resume audio context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            playSound(audioContext);
          }).catch(err => {
            console.log('Error resuming audio context:', err);
          });
        } else {
          playSound(audioContext);
        }
      } catch (error) {
        console.log('Sound play error:', error);
      }
    };
    
    const playSound = (audioContext) => {
      // First tone
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.value = 800;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.15);
      
      // Second tone (slightly higher)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.3);
    };
    
    notificationSoundRef.current = createNotificationSound;
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Listen for current conversation ID changes from Chats component
  useEffect(() => {
    const handleConversationChange = (event) => {
      currentConversationIdRef.current = event.detail?.conversationId || null;
    };

    window.addEventListener('chat-conversation-changed', handleConversationChange);
    
    return () => {
      window.removeEventListener('chat-conversation-changed', handleConversationChange);
    };
  }, []);

  // Handle message notifications globally
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleNewMessage = (newMessage) => {
      const messageConvId = newMessage.conversationId?.toString();
      const currentConvId = currentConversationIdRef.current?.toString();
      
      // Don't play sound if user is viewing this conversation
      if (messageConvId === currentConvId) {
        return;
      }

      // Check if message is from another user (not from current user)
      const isFromOtherUser = (newMessage.sender?._id?.toString() || newMessage.sender?._id) !== (user?._id?.toString() || user?._id);
      
      if (isFromOtherUser) {
        // Play sound notification (prevent spam - only once per 2 seconds per conversation)
        const now = Date.now();
        const lastSound = lastSoundTimeRef.current[messageConvId] || 0;
        const timeSinceLastSound = now - lastSound;
        
        if (timeSinceLastSound > 2000) {
          // Play sound
          try {
            if (notificationSoundRef.current) {
              notificationSoundRef.current();
            }
          } catch (soundError) {
            console.log('Sound play error:', soundError);
          }
          
          lastSoundTimeRef.current[messageConvId] = now;
        }
      }
    };

    const handleNewMessageNotification = (data) => {
      const message = data.message || data;
      const messageConvId = data.conversationId?.toString() || message?.conversationId?.toString();
      const currentConvId = currentConversationIdRef.current?.toString();
      
      // Don't play sound if user is viewing this conversation
      if (messageConvId === currentConvId) {
        return;
      }
      
      // Check if message is from another user (not from current user)
      const isFromOtherUser = (message?.sender?._id?.toString() || message?.sender?._id) !== (user?._id?.toString() || user?._id);
      
      if (isFromOtherUser) {
        // Play sound notification (prevent spam - only once per 2 seconds per conversation)
        const now = Date.now();
        const lastSound = lastSoundTimeRef.current[messageConvId] || 0;
        const timeSinceLastSound = now - lastSound;
        
        if (timeSinceLastSound > 2000) {
          // Play sound
          try {
            if (notificationSoundRef.current) {
              notificationSoundRef.current();
            }
          } catch (soundError) {
            console.log('Sound play error:', soundError);
          }
          
          lastSoundTimeRef.current[messageConvId] = now;
        }
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-message-notification', handleNewMessageNotification);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('new-message-notification', handleNewMessageNotification);
    };
  }, [socket, isConnected, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get token from cookie
      const token = getCookie('appToken');
      
      // Create socket connection
      const newSocket = io('http://localhost:3000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Handle online/offline status
      newSocket.on('user-online', (data) => {
        onlineUsersSetRef.current.add(data.userId);
        setOnlineUsers(new Set(onlineUsersSetRef.current));
      });

      newSocket.on('user-offline', (data) => {
        onlineUsersSetRef.current.delete(data.userId);
        setOnlineUsers(new Set(onlineUsersSetRef.current));
      });

      setSocket(newSocket);
      socketRef.current = newSocket;

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    isConnected,
    onlineUsers
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};


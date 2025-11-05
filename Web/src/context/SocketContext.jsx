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


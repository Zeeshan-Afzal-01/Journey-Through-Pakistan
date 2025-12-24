import { config } from 'dotenv';
config({ path: "./.env" });
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import './connection.js';
import userRouter from './routers/userRouter.js';
import authRouter from './routers/authRouter.js';
import postRouter from './routers/postRouter.js';
import notificationRouter from './routers/notificationRouter.js';
import statusRouter from './routers/statusRouter.js';
import groupRouter from './routers/groupRouter.js';
import messageRouter from './routers/messageRouter.js';
import adminRouter from './routers/adminRouter.js';
import landmarkRouter from './routers/landmarkRouter.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from './models/message.models.js';
import Conversation from './models/conversation.models.js';
import Notification from './models/notification.models.js';
import User from './models/user.models.js';
import axios from 'axios';

const app = express();
const httpServer = createServer(app);

// Trust proxy to get real IP addresses (important for IP tracking)
app.set('trust proxy', true);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));

// Attach io to app for use in routes
app.set('io', io);

// Maintenance mode check (before routes, but after admin routes are excluded in middleware)
import { checkMaintenanceMode } from './middleware/maintenanceMode.js';
app.use(checkMaintenanceMode);

app.use('/uploads', express.static('uploads'));
app.use('/users', userRouter);
app.use("/auth", authRouter);
app.use('/posts', postRouter);
app.use('/notifications', notificationRouter);
app.use('/statuses', statusRouter);
app.use('/groups', groupRouter);
app.use('/messages', messageRouter);
app.use('/admin', adminRouter);
app.use('/landmarks', landmarkRouter);

app.get('/', (req, res) => {
  res.send("Hello WORLD!");
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('appToken=')[1]?.split(';')[0];
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = decoded.id;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Store online users
const onlineUsers = new Map();

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Add user to online users
  onlineUsers.set(socket.userId, {
    socketId: socket.id,
    user: socket.user
  });

  // Join user's personal room
  socket.join(`user_${socket.userId}`);

  // Emit online status to friends
  socket.broadcast.emit('user-online', {
    userId: socket.userId,
    isOnline: true
  });

  // Handle join conversation
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Handle leave conversation
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  // Handle send message
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, recipientId, text, imageUrl } = data;
      const senderId = socket.userId;

      // Create conversation if it doesn't exist
      const senderObjId = new mongoose.Types.ObjectId(senderId);
      const recipientObjId = new mongoose.Types.ObjectId(recipientId);
      
      let conversation = await Conversation.findOne({
        participants: { $all: [senderObjId, recipientObjId], $size: 2 }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderObjId, recipientObjId]
        });
      }

      // Create message
      const message = await Message.create({
        conversationId: conversation._id.toString(),
        sender: senderId,
        recipient: recipientId,
        text,
        imageUrl
      });

      await message.populate('sender', 'name profilePicture');
      await message.populate('recipient', 'name profilePicture');

      // Update conversation last message
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      // Add conversationId to message object for frontend
      const messageWithConversation = {
        ...message.toObject(),
        conversationId: conversation._id.toString()
      };

      // Emit to conversation room (both sender and recipient will receive if they're in the room)
      io.to(`conversation_${conversation._id}`).emit('new-message', messageWithConversation);

      // Check if recipient is in the conversation room
      const recipientSockets = await io.in(`conversation_${conversation._id}`).fetchSockets();
      const recipientInRoom = recipientSockets.some(s => s.userId === recipientId);

      // Only emit notification if recipient is NOT in the conversation room
      if (!recipientInRoom) {
        io.to(`user_${recipientId}`).emit('new-message-notification', {
          message: messageWithConversation,
          conversationId: conversation._id.toString()
        });
      }
      
      // Always emit new-message to recipient's personal room (for real-time updates)
      io.to(`user_${recipientId}`).emit('new-message', messageWithConversation);

      // Don't create notification for messages - only sound and unread badges
      // Messages are handled via Socket.IO real-time updates and unread badges

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { conversationId, recipientId } = data;
    socket.to(`conversation_${conversationId}`).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user.name,
      conversationId: conversationId,
      isTyping: true
    });
  });

  socket.on('stop-typing', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user.name,
      conversationId: conversationId,
      isTyping: false
    });
  });

  // Handle call signaling
  socket.on('call-user', (data) => {
    const { userIdToCall, signalData, from, name, callType } = data;
    io.to(`user_${userIdToCall}`).emit('call-received', {
      signal: signalData,
      from: from,
      name: name,
      callType: callType || 'voice'
    });
  });

  socket.on('answer-call', (data) => {
    const { signal, to } = data;
    io.to(`user_${to}`).emit('call-accepted', signal);
  });

  socket.on('call-ended', (data) => {
    const { userIdToCall } = data;
    io.to(`user_${userIdToCall}`).emit('call-ended', {
      from: socket.userId
    });
  });

  socket.on('call-rejected', (data) => {
    const { userIdToCall } = data;
    io.to(`user_${userIdToCall}`).emit('call-rejected', {
      from: socket.userId
    });
  });

  socket.on('ice-candidate', (data) => {
    const { candidate, userIdToCall } = data;
    io.to(`user_${userIdToCall}`).emit('ice-candidate', {
      candidate: candidate,
      from: socket.userId
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
    
    // Emit offline status
    socket.broadcast.emit('user-offline', {
      userId: socket.userId,
      isOnline: false
    });
  });
});

httpServer.listen(process.env.PORT, () => {
  console.log(`Server is on! Port ${process.env.PORT}`);
  console.log(`Socket.IO server is running`);
});

// Export io for use in other modules
export { io };
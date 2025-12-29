import { config } from 'dotenv';
config({ path: "./.env" });
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import './connection.js';
import mongoose from 'mongoose';
import userRouter from './routers/userRouter.js';
import authRouter from './routers/authRouter.js';
import postRouter from './routers/postRouter.js';
import notificationRouter from './routers/notificationRouter.js';
import statusRouter from './routers/statusRouter.js';
import groupRouter from './routers/groupRouter.js';
import messageRouter from './routers/messageRouter.js';
import adminRouter from './routers/adminRouter.js';
import landmarkRouter from './routers/landmarkRouter.js';
import geminiRouter from './routers/geminiRouter.js';
import supportRouter from './routers/supportRouter.js';
import recommendationRouter from './routers/recommendationRouter.js';
import placeRouter from './routers/placeRouter.js';
import configRouter from './routers/configRouter.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

import Message from './models/message.models.js';
import Conversation from './models/conversation.models.js';
import Notification from './models/notification.models.js';
import User from './models/user.models.js';
import './models/place.models.js';
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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:5173", 
      "http://localhost:5174",
      "http://localhost:3000",
      "http://10.0.2.2:3000", // Android emulator making requests
    ];
    
    // Allow all origins in development (for mobile apps)
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev mode for mobile
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
app.use('/gemini', geminiRouter);
app.use('/support', supportRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/places', placeRouter);
app.use('/api/config', configRouter);

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

      // NOTE:
      // We previously added strict validation here to reject base64 and non-HTTP URLs.
      // Now that the frontend always sends a proper Cloudinary URL (and never base64),
      // that extra validation is no longer needed and was preventing image messages
      // from being saved in MongoDB.
      //
      // So we simply accept whatever imageUrl comes from the client and rely on the
      // upload endpoint + frontend checks to guarantee a valid Cloudinary URL.

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

      // Create message (imageUrl may be null for text-only messages)
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

  // Handle edit message
  socket.on('edit-message', async (data) => {
    try {
      const { messageId, text } = data;
      const senderId = socket.userId;

      if (!messageId || !text) {
        return socket.emit('message-error', { error: 'Message ID and text are required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message-error', { error: 'Message not found' });
      }

      // Verify user is the sender
      if (message.sender.toString() !== senderId) {
        return socket.emit('message-error', { error: 'Unauthorized' });
      }

      // Update message
      message.text = text;
      message.edited = true;
      message.editedAt = new Date();
      await message.save();

      await message.populate('sender', 'name profilePicture');
      await message.populate('recipient', 'name profilePicture');

      const messageWithConversation = {
        ...message.toObject(),
        conversationId: message.conversationId
      };

      // Emit to conversation room
      io.to(`conversation_${message.conversationId}`).emit('message-edited', messageWithConversation);
      io.to(`user_${message.recipient._id}`).emit('message-edited', messageWithConversation);

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle delete message (delete for everyone)
  socket.on('delete-message', async (data) => {
    try {
      const { messageId } = data;
      const senderId = socket.userId;

      if (!messageId) {
        return socket.emit('message-error', { error: 'Message ID is required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message-error', { error: 'Message not found' });
      }

      // Verify user is the sender
      if (message.sender.toString() !== senderId) {
        return socket.emit('message-error', { error: 'Unauthorized' });
      }

      // Mark as deleted (for everyone)
      message.deleted = true;
      message.deletedAt = new Date();
      await message.save();

      await message.populate('sender', 'name profilePicture');
      await message.populate('recipient', 'name profilePicture');

      const messageWithConversation = {
        ...message.toObject(),
        conversationId: message.conversationId
      };

      // Emit to conversation room
      io.to(`conversation_${message.conversationId}`).emit('message-deleted', messageWithConversation);
      io.to(`user_${message.recipient._id}`).emit('message-deleted', messageWithConversation);

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle delete for me (hide from current user - sender or recipient)
  socket.on('delete-for-me', async (data) => {
    try {
      const { messageId } = data;
      const userId = socket.userId;

      if (!messageId) {
        return socket.emit('message-error', { error: 'Message ID is required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message-error', { error: 'Message not found' });
      }

      const isSender = message.sender.toString() === userId;
      const isRecipient = message.recipient.toString() === userId;

      // Verify user is either sender or recipient
      if (!isSender && !isRecipient) {
        return socket.emit('message-error', { error: 'Unauthorized' });
      }

      // Mark as deleted for sender or recipient
      if (isSender) {
        message.deletedForSender = true;
        message.deletedForSenderAt = new Date();
      } else if (isRecipient) {
        message.deletedForRecipient = true;
        message.deletedForRecipientAt = new Date();
      }
      
      await message.save();

      await message.populate('sender', 'name profilePicture');
      await message.populate('recipient', 'name profilePicture');

      const messageWithConversation = {
        ...message.toObject(),
        conversationId: message.conversationId
      };

      // Emit to the user who deleted it (they won't see it anymore)
      socket.emit('message-deleted-for-me', messageWithConversation);

    } catch (error) {
      console.error('Error deleting message for me:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle unsend message (delete from both users, only within 1 hour)
  socket.on('unsend-message', async (data) => {
    try {
      const { messageId } = data;
      const senderId = socket.userId;

      if (!messageId) {
        return socket.emit('message-error', { error: 'Message ID is required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('message-error', { error: 'Message not found' });
      }

      // Verify user is the sender
      if (message.sender.toString() !== senderId) {
        return socket.emit('message-error', { error: 'Unauthorized' });
      }

      // Check if message is within 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (message.createdAt < oneHourAgo) {
        return socket.emit('message-error', { error: 'Can only unsend messages within 1 hour' });
      }

      // Mark as unsent (will be filtered out from queries)
      message.unsent = true;
      message.unsentAt = new Date();
      await message.save();

      const messageWithConversation = {
        ...message.toObject(),
        conversationId: message.conversationId
      };

      // Emit to conversation room (both users will remove it)
      io.to(`conversation_${message.conversationId}`).emit('message-unsent', messageWithConversation);
      io.to(`user_${message.recipient._id}`).emit('message-unsent', messageWithConversation);

    } catch (error) {
      console.error('Error unsending message:', error);
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

// Clean up old unique index on startup
async function cleanupOldIndex() {
  try {
    // Wait for MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }

    const collection = mongoose.connection.db.collection('conversations');
    const indexes = await collection.indexes();
    
    // Check if old unique index exists
    const oldIndex = indexes.find(idx => idx.name === 'participants_1' && idx.unique === true);
    
    if (oldIndex) {
      console.log('⚠️  Found old unique index participants_1, attempting to drop...');
      try {
        await collection.dropIndex('participants_1');
        console.log('✅ Successfully dropped old unique index: participants_1');
      } catch (error) {
        console.error('❌ Error dropping old index:', error.message);
        console.log('💡 You may need to manually drop it: db.conversations.dropIndex("participants_1")');
      }
    } else {
      console.log('✅ No old unique index found (already cleaned up)');
    }
  } catch (error) {
    console.error('⚠️  Error during index cleanup:', error.message);
  }
}

// Run cleanup after connection is established
mongoose.connection.once('connected', () => {
  cleanupOldIndex();
});

httpServer.listen(process.env.PORT, () => {
  console.log(`Server is on! Port ${process.env.PORT}`);
  console.log(`Socket.IO server is running`);
});

// Export io for use in other modules
export { io };
import Message from '../models/message.models.js';
import Conversation from '../models/conversation.models.js';
import User from '../models/user.models.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check if profile picture file exists
const checkProfilePictureExists = (profilePicturePath) => {
  if (!profilePicturePath) return false;
  try {
    const fullPath = path.join(__dirname, "..", profilePicturePath);
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
};

// Upload chat image
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const imageUrl = `uploads/chats/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Error uploading image", error: error.message });
  }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Convert to ObjectIds
    const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);
    const userIdObjId = new mongoose.Types.ObjectId(userId);
    
    // Find conversation with both participants
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserObjId, userIdObjId], $size: 2 }
    }).populate('participants', 'name email profilePicture')
      .populate('lastMessage');

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [currentUserObjId, userIdObjId]
      });
      await conversation.populate('participants', 'name email profilePicture');
    }

    // Add hasProfilePicture to participants
    const conversationObj = conversation.toObject ? conversation.toObject() : conversation;
    if (conversationObj.participants && Array.isArray(conversationObj.participants)) {
      conversationObj.participants = conversationObj.participants.map(p => {
        const participantObj = p.toObject ? p.toObject() : p;
        participantObj.hasProfilePicture = checkProfilePictureExists(participantObj.profilePicture);
        return participantObj;
      });
    }

    res.json(conversationObj);
  } catch (error) {
    res.status(500).json({ message: "Error getting conversation", error: error.message });
  }
};

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const conversations = await Conversation.find({
      participants: currentUserId
    })
    .populate('participants', 'name email profilePicture')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

    // Get unread counts for all conversations
    const conversationIds = conversations.map(conv => conv._id.toString());
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          recipient: new mongoose.Types.ObjectId(currentUserId),
          read: false
        }
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of conversationId to unread count
    const unreadMap = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id] = item.count;
    });

    // Format conversations for frontend
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== currentUserId
      );
      
      const convId = conv._id.toString();
      
      // Add hasProfilePicture to participants
      const participantsWithPictureCheck = conv.participants.map(p => {
        const participantObj = p.toObject ? p.toObject() : p;
        participantObj.hasProfilePicture = checkProfilePictureExists(participantObj.profilePicture);
        return participantObj;
      });
      
      const otherParticipantObj = otherParticipant?.toObject ? otherParticipant.toObject() : otherParticipant;
      const hasProfilePicture = checkProfilePictureExists(otherParticipantObj?.profilePicture);
      
      return {
        _id: conv._id,
        id: convId,
        conversationId: convId,
        userId: otherParticipantObj?._id?.toString() || otherParticipantObj?._id,
        name: otherParticipantObj?.name || 'Unknown',
        avatar: otherParticipantObj?.profilePicture || '',
        hasProfilePicture: hasProfilePicture,
        lastMessage: conv.lastMessage?.text || '',
        lastMessageAt: conv.lastMessageAt,
        snippet: conv.lastMessage?.text || 'No messages yet',
        time: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
        unreadCount: unreadMap[convId] || 0,
        participants: participantsWithPictureCheck
      };
    });

    res.json(formattedConversations);
  } catch (error) {
    res.status(500).json({ message: "Error getting conversations", error: error.message });
  }
};

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    // Verify user is part of this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is a participant
    const participantIds = conversation.participants.map(p => p.toString());
    if (!participantIds.includes(currentUserId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ conversationId: conversationId })
      .populate('sender', 'name profilePicture')
      .populate('recipient', 'name profilePicture')
      .sort({ createdAt: 1 });

    // Add hasProfilePicture to sender and recipient
    const messagesWithPictureCheck = messages.map(msg => {
      const msgObj = msg.toObject ? msg.toObject() : msg;
      if (msgObj.sender) {
        msgObj.sender.hasProfilePicture = checkProfilePictureExists(msgObj.sender.profilePicture);
      }
      if (msgObj.recipient) {
        msgObj.recipient.hasProfilePicture = checkProfilePictureExists(msgObj.recipient.profilePicture);
      }
      return msgObj;
    });

    res.json(messagesWithPictureCheck);
  } catch (error) {
    res.status(500).json({ message: "Error getting messages", error: error.message });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    await Message.updateMany(
      {
        conversationId,
        recipient: currentUserId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error marking messages as read", error: error.message });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const unreadCount = await Message.countDocuments({
      recipient: currentUserId,
      read: false
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Error getting unread count", error: error.message });
  }
};

// Get chats with local connections (opposite role users)
// If user is "local", show chats with "tourist" users
// If user is "tourist", show chats with "local" users
export const getLocalChats = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Get current user's role
    const currentUser = await User.findById(currentUserId).select('role').lean();
    if (!currentUser) {
      return res.json([]);
    }
    
    // Determine target role: if current user is "local", find "tourist" users, and vice versa
    const targetRole = currentUser.role === 'local' ? 'tourist' : 'local';
    
    // Find conversations with target role users
    // Get all conversations where current user is a participant
    const allConversations = await Conversation.find({
      participants: currentUserId
    })
    .populate('participants', 'name email profilePicture city role')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .lean();
    
    // Filter to only include conversations with target role users (one-on-one)
    const conversations = allConversations.filter(conv => {
      if (!conv.participants || conv.participants.length !== 2) return false
      const otherParticipant = conv.participants.find(p => {
        const pId = p._id ? p._id.toString() : String(p)
        return pId !== String(currentUserId)
      })
      if (!otherParticipant) return false
      // Check if other participant has the target role (opposite of current user's role)
      const participantRole = otherParticipant.role ? String(otherParticipant.role).toLowerCase() : '';
      return participantRole === targetRole
    }).slice(0, 10)
    
    // Get unread counts
    const conversationIds = conversations.map(conv => conv._id.toString());
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          recipient: new mongoose.Types.ObjectId(currentUserId),
          read: false
        }
      },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const unreadMap = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id] = item.count;
    });
    
    // Format conversations
    const formattedConversations = conversations.map(conv => {
      const convId = conv._id ? conv._id.toString() : String(conv._id);
      const otherParticipant = conv.participants.find(p => {
        const pId = p._id ? p._id.toString() : String(p._id || p);
        return pId !== String(currentUserId);
      });
      
      // Add hasProfilePicture to participants
      const participantsWithPictureCheck = (conv.participants || []).map(p => {
        const participantObj = p;
        participantObj.hasProfilePicture = checkProfilePictureExists(participantObj.profilePicture);
        return participantObj;
      });
      
      return {
        _id: conv._id,
        conversationId: convId,
        participants: participantsWithPictureCheck,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unread: unreadMap[convId] || 0,
        otherParticipant: otherParticipant ? {
          ...otherParticipant,
          hasProfilePicture: checkProfilePictureExists(otherParticipant.profilePicture)
        } : null
      };
    });
    
    res.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching local chats:', error);
    res.status(500).json({ message: "Error fetching local chats", error: error.message });
  }
};

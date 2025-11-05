import Message from '../models/message.models.js';
import Conversation from '../models/conversation.models.js';
import User from '../models/user.models.js';
import mongoose from 'mongoose';

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

    res.json(conversation);
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
      
      return {
        _id: conv._id,
        id: convId,
        conversationId: convId,
        userId: otherParticipant?._id?.toString() || otherParticipant?._id,
        name: otherParticipant?.name || 'Unknown',
        avatar: otherParticipant?.profilePicture || '',
        lastMessage: conv.lastMessage?.text || '',
        lastMessageAt: conv.lastMessageAt,
        snippet: conv.lastMessage?.text || 'No messages yet',
        time: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
        unreadCount: unreadMap[convId] || 0,
        participants: conv.participants
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

    res.json(messages);
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

import Message from '../models/message.models.js';
import Conversation from '../models/conversation.models.js';
import User from '../models/user.models.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check if profile picture exists
// Now supports both Cloudinary URLs and local file paths
const checkProfilePictureExists = (profilePicturePath) => {
  if (!profilePicturePath) return false;
  try {
    // If it's a Cloudinary URL (starts with http/https), consider it valid
    if (profilePicturePath.startsWith('http://') || profilePicturePath.startsWith('https://')) {
      return true;
    }
    // Otherwise, check if local file exists (for backward compatibility)
    const fullPath = path.join(__dirname, "..", profilePicturePath);
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
};

// Upload chat image
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload to Cloudinary using a stream
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'jtp/chats',
          resource_type: 'image'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    res.json({ imageUrl: uploadResult.secure_url, publicId: uploadResult.public_id });
  } catch (error) {
    console.error('Error uploading chat image to Cloudinary:', error);
    res.status(500).json({ message: "Error uploading image", error: error.message });
  }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    console.log('getOrCreateConversation called with userId:', userId, 'currentUserId:', currentUserId);

    // Validate userId parameter
    if (!userId) {
      console.error('userId is missing');
      return res.status(400).json({ message: "User ID is required" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid userId format:', userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
      console.error('Invalid currentUserId format:', currentUserId);
      return res.status(400).json({ message: "Invalid current user ID format" });
    }

    // Prevent user from creating conversation with themselves
    if (userId === currentUserId) {
      console.error('User trying to create conversation with themselves');
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    // Convert to ObjectIds and consistently sort the pair to avoid duplicate-key errors
    const participantsPair = [
      new mongoose.Types.ObjectId(currentUserId),
      new mongoose.Types.ObjectId(userId)
    ].sort((a, b) => a.toString().localeCompare(b.toString()));
    const [currentUserObjId, userIdObjId] = participantsPair;
    
    // Verify both users exist before creating conversation
    const [currentUserExists, targetUserExists] = await Promise.all([
      User.findById(currentUserObjId).select('_id').lean(),
      User.findById(userIdObjId).select('_id').lean()
    ]);

    console.log('User existence check - currentUser:', !!currentUserExists, 'targetUser:', !!targetUserExists);

    if (!currentUserExists) {
      console.error('Current user not found:', currentUserId);
      return res.status(404).json({ message: "Current user not found" });
    }

    if (!targetUserExists) {
      console.error('Target user not found:', userId);
      return res.status(404).json({ message: "Target user not found" });
    }
    
    // Find conversation with both participants using $all to match regardless of order
    let conversation = null;
    try {
      conversation = await Conversation.findOne({
        participants: { $all: participantsPair, $size: 2 }
      }).populate('participants', 'name email profilePicture');

      console.log('Found existing conversation:', !!conversation);
      
      // Populate lastMessage only if it exists
      if (conversation && conversation.lastMessage) {
        await conversation.populate('lastMessage');
      }
    } catch (findError) {
      console.error('Error finding conversation:', findError);
      throw findError;
    }

    if (!conversation) {
      console.log('No existing conversation found, creating new one');
      // Create new conversation
      // Handle potential duplicate key error from unique index
      try {
        conversation = await Conversation.create({
          participants: participantsPair
        });
        console.log('Conversation created:', conversation._id);
        
        // Populate participants after creation
        await conversation.populate('participants', 'name email profilePicture');
        
        console.log('Participants populated after creation');
      } catch (createError) {
        console.error('Error creating conversation:', createError);
        // If duplicate key error, try to find the conversation again using $all
        if (createError.code === 11000) {
          console.log('Duplicate key error, finding existing conversation');
          console.log('Searching for conversation with participants:', participantsPair.map(p => p.toString()));
          
          // Try multiple query strategies to find the conversation
          conversation = await Conversation.findOne({
            participants: { $all: participantsPair, $size: 2 }
          }).populate('participants', 'name email profilePicture');
          
          // If still not found, try without size constraint (in case of data inconsistency)
          if (!conversation) {
            console.log('Trying alternative query without size constraint');
            conversation = await Conversation.findOne({
              participants: { $all: participantsPair }
            }).populate('participants', 'name email profilePicture');
          }
          
          console.log('Conversation found after duplicate key error:', !!conversation);
          
          if (conversation && conversation.lastMessage) {
            await conversation.populate('lastMessage');
          }
          
          // If still not found, the old unique index is blocking creation
          if (!conversation) {
            console.error('CRITICAL: Old unique index is blocking conversation creation. Please drop the index: db.conversations.dropIndex("participants_1")');
            return res.status(500).json({ 
              message: "Failed to create conversation. Database index issue detected. Please contact administrator.",
              error: "Old unique index 'participants_1' needs to be dropped"
            });
          }
        } else {
          throw createError;
        }
      }
    }

    // Verify conversation was created/found
    if (!conversation) {
      console.error('Conversation is null after create/find');
      return res.status(500).json({ message: "Failed to create or find conversation" });
    }

    console.log('Conversation found/created, checking participants...');
    console.log('Participants before processing:', conversation.participants?.length, conversation.participants);

    // Ensure participants are populated - reload if needed
    try {
      // Check if participants need to be populated
      const needsPopulate = !conversation.participants || 
                           conversation.participants.length === 0 ||
                           conversation.participants.some(p => 
                             p instanceof mongoose.Types.ObjectId || 
                             (typeof p === 'string' && /^[0-9a-fA-F]{24}$/.test(p))
                           );

      if (needsPopulate) {
        console.log('Re-populating participants...');
        await conversation.populate('participants', 'name email profilePicture');
      }
    } catch (populateError) {
      console.error('Error populating participants:', populateError);
      return res.status(500).json({ message: "Error loading participants", error: populateError.message });
    }

    // Check if any participant is null (user might have been deleted)
    if (!conversation.participants || !Array.isArray(conversation.participants)) {
      console.error('Participants is not an array:', conversation.participants);
      return res.status(500).json({ message: "Invalid participants data" });
    }

    // Filter out null, undefined, and unpopulated ObjectIds
    const validParticipants = conversation.participants.filter(p => {
      if (!p) {
        console.log('Filtered out null/undefined participant');
        return false;
      }
      // Check if it's an ObjectId (not populated)
      if (p instanceof mongoose.Types.ObjectId) {
        console.log('Filtered out unpopulated ObjectId participant');
        return false;
      }
      // Check if it's a string ObjectId (not populated)
      if (typeof p === 'string' && /^[0-9a-fA-F]{24}$/.test(p)) {
        console.log('Filtered out string ObjectId participant');
        return false;
      }
      return true;
    });

    console.log('Valid participants after filtering:', validParticipants.length);

    if (validParticipants.length < 2) {
      console.error('Not enough valid participants. Found:', validParticipants.length);
      console.error('All participants:', conversation.participants);
      console.error('Participant types:', conversation.participants.map(p => ({
        type: typeof p,
        isObjectId: p instanceof mongoose.Types.ObjectId,
        value: p
      })));
      return res.status(404).json({ message: "One or more participants not found" });
    }

    // Process participants before converting conversation to object
    console.log('Processing participants...');
    const processedParticipants = validParticipants.map((p, index) => {
      try {
        console.log(`Processing participant ${index}:`, p?.constructor?.name, typeof p);
        
        // Safety check - ensure p is not null
        if (!p) {
          console.error(`Participant ${index} is null`);
          return null;
        }

        // If it's a Mongoose document, convert to plain object
        let participantObj;
        if (typeof p === 'object' && p !== null) {
          if (typeof p.toObject === 'function') {
            try {
              participantObj = p.toObject();
              console.log(`Participant ${index} converted from Mongoose document`);
            } catch (toObjectError) {
              console.error(`Error calling toObject on participant ${index}:`, toObjectError);
              // If toObject fails, try to use the object as-is
              participantObj = p;
            }
          } else {
            // Already a plain object
            participantObj = p;
            console.log(`Participant ${index} is already a plain object`);
          }
        } else {
          console.error(`Invalid participant ${index} type:`, typeof p, p);
          return null;
        }

        if (!participantObj || typeof participantObj !== 'object') {
          console.error(`Participant ${index} object is invalid:`, participantObj);
          return null;
        }

        // Add hasProfilePicture property
        participantObj.hasProfilePicture = checkProfilePictureExists(participantObj.profilePicture);
        console.log(`Participant ${index} processed successfully`);
        return participantObj;
      } catch (error) {
        console.error(`Error processing participant ${index}:`, error);
        console.error('Participant data:', p);
        return null;
      }
    }).filter(p => p !== null && typeof p === 'object');

    console.log('Processed participants count:', processedParticipants.length);

    if (processedParticipants.length < 2) {
      console.error('Not enough processed participants:', processedParticipants.length);
      return res.status(500).json({ message: "Error processing participants" });
    }

    // Convert conversation to plain object
    let conversationObj;
    try {
      if (!conversation) {
        throw new Error('Conversation is null');
      }
      
      if (typeof conversation.toObject === 'function') {
        conversationObj = conversation.toObject();
      } else if (typeof conversation === 'object') {
        conversationObj = conversation;
      } else {
        throw new Error('Conversation is not an object');
      }
      
      console.log('Conversation converted to object successfully');
    } catch (error) {
      console.error('Error converting conversation to object:', error);
      console.error('Conversation type:', typeof conversation);
      console.error('Conversation value:', conversation);
      return res.status(500).json({ message: "Error processing conversation", error: error.message });
    }

    // Replace participants with processed ones
    if (conversationObj && typeof conversationObj === 'object') {
      conversationObj.participants = processedParticipants;
      console.log('Participants replaced in conversation object');
    }

    console.log('Sending response with conversation:', conversationObj._id);
    res.json(conversationObj);
  } catch (error) {
    console.error('========== ERROR in getOrCreateConversation ==========');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('Request user:', req.user ? { id: req.user.id } : 'No user');
    console.error('====================================================');
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

    const messages = await Message.find({ 
      conversationId: conversationId,
      unsent: { $ne: true }, // Exclude unsent messages
      $and: [
        {
          $or: [
            { deletedForSender: { $ne: true } }, // Show messages not deleted for sender
            { sender: { $ne: currentUserId } } // Or show messages where current user is not sender
          ]
        },
        {
          $or: [
            { deletedForRecipient: { $ne: true } }, // Show messages not deleted for recipient
            { recipient: { $ne: currentUserId } } // Or show messages where current user is not recipient
          ]
        }
      ]
    })
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

// Delete a single conversation and all its messages
export const deleteConversation = async (req, res) => {
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
    
    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversationId });
    
    // Delete the conversation itself
    await Conversation.findByIdAndDelete(conversationId);
    
    res.json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: "Error deleting conversation", error: error.message });
  }
};

// Delete multiple conversations and their messages
export const deleteMultipleConversations = async (req, res) => {
  try {
    const { conversationIds } = req.body;
    const currentUserId = req.user.id;
    
    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ message: "Conversation IDs array is required" });
    }
    
    // Find all conversations to verify user has access to them
    const conversations = await Conversation.find({
      _id: { $in: conversationIds }
    });
    
    // Filter conversations that the user has access to
    const accessibleConversations = conversations.filter(conv => {
      const participantIds = conv.participants.map(p => p.toString());
      return participantIds.includes(currentUserId);
    });
    
    if (accessibleConversations.length === 0) {
      return res.status(403).json({ message: "Access denied to all specified conversations" });
    }
    
    const accessibleConversationIds = accessibleConversations.map(conv => conv._id);
    
    // Delete all messages in the accessible conversations
    await Message.deleteMany({
      conversationId: { $in: accessibleConversationIds }
    });
    
    // Delete the conversations themselves
    await Conversation.deleteMany({
      _id: { $in: accessibleConversationIds }
    });
    
    res.json({ 
      message: "Conversations deleted successfully",
      deletedCount: accessibleConversations.length
    });
  } catch (error) {
    console.error('Error deleting multiple conversations:', error);
    res.status(500).json({ message: "Error deleting conversations", error: error.message });
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

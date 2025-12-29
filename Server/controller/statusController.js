import Status from "../models/status.models.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to check if profile picture file exists
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

export const createStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { caption } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let mediaUrl = null;
    if (req.file && req.file.buffer) {
      try {
        const { uploadToCloudinary } = await import('../utils/cloudinary.js');
        const isVideo = req.file.mimetype.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'jtp/statuses', resourceType);
        mediaUrl = uploadResult.url;
      } catch (uploadError) {
        console.error('Error uploading status media to Cloudinary:', uploadError);
        return res.status(500).json({ message: "Error uploading status media", error: uploadError.message });
      }
    }
    if (!mediaUrl) return res.status(400).json({ message: "Status media is required" });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await Status.create({ author: userId, mediaUrl, caption, expiresAt });
    const populated = await status.populate("author", "name profilePicture");
    
    // Add hasProfilePicture to author
    const statusObj = populated.toObject ? populated.toObject() : populated;
    if (statusObj.author) {
      statusObj.author.hasProfilePicture = checkProfilePictureExists(statusObj.author.profilePicture);
    }
    
    res.status(201).json(statusObj);
  } catch (err) {
    res.status(500).json({ message: "Failed to create status", error: err.message });
  }
};

export const listActiveStatuses = async (req, res) => {
  try {
    const now = new Date();
    const statuses = await Status.find({ expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture")
      .populate("views", "name profilePicture")
      .populate("reactions.user", "name profilePicture")
      .populate("messages.author", "name profilePicture")
      .lean();
    
    // Add hasProfilePicture to all populated users
    const statusesWithPictureCheck = statuses.map(status => {
      if (status.author) {
        status.author.hasProfilePicture = checkProfilePictureExists(status.author.profilePicture);
      }
      if (status.views && Array.isArray(status.views)) {
        status.views = status.views.map(view => {
          view.hasProfilePicture = checkProfilePictureExists(view.profilePicture);
          return view;
        });
      }
      if (status.reactions && Array.isArray(status.reactions)) {
        status.reactions = status.reactions.map(reaction => {
          if (reaction.user) {
            reaction.user.hasProfilePicture = checkProfilePictureExists(reaction.user.profilePicture);
          }
          return reaction;
        });
      }
      if (status.messages && Array.isArray(status.messages)) {
        status.messages = status.messages.map(message => {
          if (message.author) {
            message.author.hasProfilePicture = checkProfilePictureExists(message.author.profilePicture);
          }
          return message;
        });
      }
      return status;
    });
    
    res.json(statusesWithPictureCheck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch statuses", error: err.message });
  }
};

export const getUserStatuses = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const statuses = await Status.find({ author: userId, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture")
      .populate("views", "name profilePicture")
      .populate("reactions.user", "name profilePicture")
      .populate("messages.author", "name profilePicture")
      .lean();
    
    // Add hasProfilePicture to all populated users
    const statusesWithPictureCheck = statuses.map(status => {
      if (status.author) {
        status.author.hasProfilePicture = checkProfilePictureExists(status.author.profilePicture);
      }
      if (status.views && Array.isArray(status.views)) {
        status.views = status.views.map(view => {
          view.hasProfilePicture = checkProfilePictureExists(view.profilePicture);
          return view;
        });
      }
      if (status.reactions && Array.isArray(status.reactions)) {
        status.reactions = status.reactions.map(reaction => {
          if (reaction.user) {
            reaction.user.hasProfilePicture = checkProfilePictureExists(reaction.user.profilePicture);
          }
          return reaction;
        });
      }
      if (status.messages && Array.isArray(status.messages)) {
        status.messages = status.messages.map(message => {
          if (message.author) {
            message.author.hasProfilePicture = checkProfilePictureExists(message.author.profilePicture);
          }
          return message;
        });
      }
      return status;
    });
    
    res.json(statusesWithPictureCheck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user statuses", error: err.message });
  }
};

export const markViewed = async (req, res) => {
  try {
    const viewerId = req.user?.id;
    const { id } = req.params;
    if (!viewerId) return res.status(401).json({ message: "Unauthorized" });
    const doc = await Status.findById(id);
    if (!doc) return res.status(404).json({ message: "Status not found" });
    if (!doc.views.some((v) => v.toString() === viewerId)) {
      doc.views.push(viewerId);
      await doc.save();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark viewed", error: err.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { type } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!type || !['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type" });
    }
    
    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });
    
    // Remove existing reaction from this user
    status.reactions = status.reactions.filter(r => r.user.toString() !== userId);
    // Add new reaction
    status.reactions.push({ user: userId, type });
    await status.save();
    
    const populated = await Status.findById(id)
      .populate("author", "name profilePicture")
      .populate("views", "name profilePicture")
      .populate("reactions.user", "name profilePicture")
      .populate("messages.author", "name profilePicture");
    
    // Add hasProfilePicture to all populated users
    const statusObj = populated.toObject ? populated.toObject() : populated;
    if (statusObj.author) {
      statusObj.author.hasProfilePicture = checkProfilePictureExists(statusObj.author.profilePicture);
    }
    if (statusObj.views && Array.isArray(statusObj.views)) {
      statusObj.views = statusObj.views.map(view => {
        const viewObj = view.toObject ? view.toObject() : view;
        viewObj.hasProfilePicture = checkProfilePictureExists(viewObj.profilePicture);
        return viewObj;
      });
    }
    if (statusObj.reactions && Array.isArray(statusObj.reactions)) {
      statusObj.reactions = statusObj.reactions.map(reaction => {
        if (reaction.user) {
          const userObj = reaction.user.toObject ? reaction.user.toObject() : reaction.user;
          userObj.hasProfilePicture = checkProfilePictureExists(userObj.profilePicture);
          reaction.user = userObj;
        }
        return reaction;
      });
    }
    if (statusObj.messages && Array.isArray(statusObj.messages)) {
      statusObj.messages = statusObj.messages.map(message => {
        if (message.author) {
          const authorObj = message.author.toObject ? message.author.toObject() : message.author;
          authorObj.hasProfilePicture = checkProfilePictureExists(authorObj.profilePicture);
          message.author = authorObj;
        }
        return message;
      });
    }
    
    res.json(statusObj);
  } catch (err) {
    res.status(500).json({ message: "Failed to add reaction", error: err.message });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });
    
    status.reactions = status.reactions.filter(r => r.user.toString() !== userId);
    await status.save();
    
    const populated = await Status.findById(id)
      .populate("author", "name profilePicture")
      .populate("views", "name profilePicture")
      .populate("reactions.user", "name profilePicture")
      .populate("messages.author", "name profilePicture");
    
    // Add hasProfilePicture to all populated users
    const statusObj = populated.toObject ? populated.toObject() : populated;
    if (statusObj.author) {
      statusObj.author.hasProfilePicture = checkProfilePictureExists(statusObj.author.profilePicture);
    }
    if (statusObj.views && Array.isArray(statusObj.views)) {
      statusObj.views = statusObj.views.map(view => {
        const viewObj = view.toObject ? view.toObject() : view;
        viewObj.hasProfilePicture = checkProfilePictureExists(viewObj.profilePicture);
        return viewObj;
      });
    }
    if (statusObj.reactions && Array.isArray(statusObj.reactions)) {
      statusObj.reactions = statusObj.reactions.map(reaction => {
        if (reaction.user) {
          const userObj = reaction.user.toObject ? reaction.user.toObject() : reaction.user;
          userObj.hasProfilePicture = checkProfilePictureExists(userObj.profilePicture);
          reaction.user = userObj;
        }
        return reaction;
      });
    }
    if (statusObj.messages && Array.isArray(statusObj.messages)) {
      statusObj.messages = statusObj.messages.map(message => {
        if (message.author) {
          const authorObj = message.author.toObject ? message.author.toObject() : message.author;
          authorObj.hasProfilePicture = checkProfilePictureExists(authorObj.profilePicture);
          message.author = authorObj;
        }
        return message;
      });
    }
    
    res.json(statusObj);
  } catch (err) {
    res.status(500).json({ message: "Failed to remove reaction", error: err.message });
  }
};

export const addMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { text } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Message text is required" });
    }
    
    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });
    
    status.messages.push({ author: userId, text: text.trim() });
    await status.save();
    
    const populated = await Status.findById(id)
      .populate("author", "name profilePicture")
      .populate("views", "name profilePicture")
      .populate("reactions.user", "name profilePicture")
      .populate("messages.author", "name profilePicture");
    
    // Create notification for status author
    if (status.author.toString() !== userId) {
      const Notification = (await import("../models/notification.models.js")).default;
      await Notification.create({
        recipient: status.author,
        actor: userId,
        type: "status_message",
        status: status._id,
        message: "sent you a message on your status",
      });
    }
    
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to add message", error: err.message });
  }
};



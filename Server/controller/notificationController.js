import Notification from "../models/notification.models.js";
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

export const listMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    // Exclude message type notifications - messages are handled via Socket.IO and unread badges
    const notifications = await Notification.find({ 
      recipient: userId,
      type: { $ne: 'message' } // Exclude message type notifications
    })
      .sort({ createdAt: -1 })
      .populate("actor", "name profilePicture isAdmin adminRole")
      .populate("post", "_id")
      .populate("status", "_id")
      .lean();
    
    // Add hasProfilePicture to actors and mark admin announcements
    const notificationsWithPictureCheck = notifications.map(notification => {
      if (notification.actor) {
        notification.actor.hasProfilePicture = checkProfilePictureExists(notification.actor.profilePicture);
        // For admin announcements, mark that actor is admin
        if (notification.type === 'admin_announcement') {
          notification.actor.isAdmin = true;
        }
      }
      return notification;
    });
    
    res.json(notificationsWithPictureCheck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await Notification.updateMany({ recipient: userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notifications read", error: err.message });
  }
};

// Activity feed for actions performed by a user (likes/comments/shares)
export const listActivity = async (req, res) => {
  try {
    const actorId = req.query.actor || req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });
    const notifications = await Notification.find({ actor: actorId })
      .sort({ createdAt: -1 })
      .populate("actor", "name profilePicture")
      .populate("recipient", "name")
      .lean();
    
    // Add hasProfilePicture to actors
    const notificationsWithPictureCheck = notifications.map(notification => {
      if (notification.actor) {
        notification.actor.hasProfilePicture = checkProfilePictureExists(notification.actor.profilePicture);
      }
      return notification;
    });
    
    res.json(notificationsWithPictureCheck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch activity", error: err.message });
  }
};



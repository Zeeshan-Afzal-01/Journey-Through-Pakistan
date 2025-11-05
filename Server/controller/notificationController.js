import Notification from "../models/notification.models.js";

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
      .populate("actor", "name profilePicture")
      .populate("post", "_id")
      .populate("status", "_id")
      .lean();
    res.json(notifications);
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
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch activity", error: err.message });
  }
};



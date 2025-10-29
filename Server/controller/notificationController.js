import Notification from "../models/notification.models.js";

export const listMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .populate("actor", "name profilePicture")
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



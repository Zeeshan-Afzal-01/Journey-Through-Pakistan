import Status from "../models/status.models.js";

export const createStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { caption } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let mediaUrl = null;
    if (req.file) {
      mediaUrl = `uploads/statuses/${req.file.filename}`;
    }
    if (!mediaUrl) return res.status(400).json({ message: "Status media is required" });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await Status.create({ author: userId, mediaUrl, caption, expiresAt });
    const populated = await status.populate("author", "name profilePicture");
    res.status(201).json(populated);
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
      .lean();
    res.json(statuses);
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
      .lean();
    res.json(statuses);
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



import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "comment", "share", "friend_request", "friend_accept", "status_message", "tag", "message", "admin_announcement"], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // optional for non-post notifications
    status: { type: mongoose.Schema.Types.ObjectId, ref: "Status" }, // optional for status-related notifications
    message: { type: String },
    title: { type: String }, // optional title for admin announcements
    readAt: { type: Date },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;



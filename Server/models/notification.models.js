import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "comment", "share", "friend_request", "friend_accept"], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // optional for non-post notifications
    message: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;



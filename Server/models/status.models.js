import mongoose from "mongoose";

const statusMessageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const statusSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    caption: { type: String },
    expiresAt: { type: Date, required: true },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], required: true },
    }],
    messages: [statusMessageSchema],
  },
  { timestamps: true }
);

// Automatically remove statuses after expiry via TTL index
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Status = mongoose.model("Status", statusSchema);

export default Status;



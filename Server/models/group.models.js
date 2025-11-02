import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For private groups
    coverImage: { type: String },
    groupPhoto: { type: String }, // Group profile picture/avatar
    privacy: { 
      type: String, 
      enum: ["public", "private"], 
      default: "public" 
    }, // public: anyone can join, private: admin approval needed
    category: { type: String }, // e.g., "Travel", "Food", "Photography", etc.
    location: { type: String }, // e.g., "Lahore", "Islamabad", etc.
    rules: [{ type: String }], // Group rules
    tags: [{ type: String }], // Group tags for discovery
  },
  { timestamps: true }
);

// Index for better search performance
groupSchema.index({ name: "text", description: "text", tags: "text" });

const Group = mongoose.model("Group", groupSchema);

export default Group;


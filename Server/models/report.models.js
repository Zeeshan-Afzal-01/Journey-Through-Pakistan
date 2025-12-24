import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    contentType: { 
      type: String, 
      enum: ["post", "comment"], 
      required: true 
    },
    contentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      refPath: 'contentModel'
    },
    contentModel: {
      type: String,
      enum: ['Post', 'Comment'],
      required: true
    },
    reason: { 
      type: String, 
      enum: [
        "Spam", 
        "Hate speech", 
        "Harassment", 
        "Inappropriate content", 
        "False information", 
        "Violence", 
        "Other"
      ], 
      required: true 
    },
    description: { 
      type: String, 
      default: "" 
    },
    status: { 
      type: String, 
      enum: ["Pending", "Resolved", "Dismissed"], 
      default: "Pending" 
    },
    resolvedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    resolvedAt: { 
      type: Date 
    },
    resolutionNote: { 
      type: String, 
      default: "" 
    }
  },
  { timestamps: true }
);

// Index for faster queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ contentType: 1, contentId: 1 });
reportSchema.index({ reporter: 1 });

// Prevent duplicate reports from same user for same content
reportSchema.index({ reporter: 1, contentType: 1, contentId: 1 }, { unique: true });

const Report = mongoose.model("Report", reportSchema);

export default Report;


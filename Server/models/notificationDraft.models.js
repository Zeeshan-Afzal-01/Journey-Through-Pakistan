import mongoose from "mongoose";

const notificationDraftSchema = new mongoose.Schema(
  {
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    title: { 
      type: String, 
      default: '' 
    },
    message: { 
      type: String, 
      required: true 
    },
    targetAudience: { 
      type: String, 
      enum: ["all", "tourists", "locals", "regions"], 
      default: "all" 
    },
    deliveryMethod: {
      push: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true }
    },
    schedule: { 
      type: Date 
    },
    status: { 
      type: String, 
      enum: ["draft", "sent"], 
      default: "draft" 
    },
    sentAt: { 
      type: Date 
    },
    sentToCount: { 
      type: Number, 
      default: 0 
    }
  },
  { timestamps: true }
);

const NotificationDraft = mongoose.model("NotificationDraft", notificationDraftSchema);

export default NotificationDraft;


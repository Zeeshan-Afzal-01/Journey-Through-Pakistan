import mongoose from "mongoose";

const securityLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'login_success',
        'login_failed',
        'logout',
        'password_change',
        'password_reset',
        'permission_change',
        'role_change',
        'admin_action',
        'suspicious_activity',
        'account_locked',
        'account_unlocked',
        'email_change',
        'profile_update',
        'api_access',
        'file_upload',
        'data_export',
        'settings_change',
        'backup_created',
        'backup_restored',
        'backup_deleted',
        'other'
      ]
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false // Can be null for failed login attempts
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false // Admin who performed the action
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false // User affected by the action
    },
    ipAddress: {
      type: String,
      required: false
    },
    userAgent: {
      type: String,
      required: false
    },
    description: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // For storing additional data
      default: {}
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'warning', 'info'],
      default: 'info'
    },
    location: {
      country: String,
      city: String,
      region: String
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
securityLogSchema.index({ createdAt: -1 });
securityLogSchema.index({ eventType: 1 });
securityLogSchema.index({ userId: 1 });
securityLogSchema.index({ adminId: 1 });
securityLogSchema.index({ severity: 1 });
securityLogSchema.index({ status: 1 });
securityLogSchema.index({ ipAddress: 1 });

const SecurityLog = mongoose.model("SecurityLog", securityLogSchema);

export default SecurityLog;


import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // General Settings
    appName: { type: String, default: "Journey Through Pakistan" },
    appUrl: { type: String, default: "https://journeythroughpakistan.com" },
    timezone: { type: String, default: "Asia/Karachi" },
    language: { type: String, default: "en" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    enableRegistration: { type: Boolean, default: true },
    requireEmailVerification: { type: Boolean, default: true },
    
    // Server Settings
    port: { type: Number, default: 3000 },
    nodeEnv: { type: String, default: "development" },
    frontendUrl: { type: String, default: "http://localhost:5173" },
    
    // Database Settings (read-only for security)
    mongodbUri: { type: String, default: "" }, // Will be masked
    
    // Security Settings
    secretKey: { type: String, default: "" }, // Will be masked
    requireStrongPassword: { type: Boolean, default: true },
    minPasswordLength: { type: Number, default: 8 },
    enable2FA: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 30 },
    maxLoginAttempts: { type: Number, default: 5 },
    
    // Email/SMTP Settings
    smtpHost: { type: String, default: "smtp.gmail.com" },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: "" },
    smtpPassword: { type: String, default: "" }, // Will be encrypted
    fromEmail: { type: String, default: "noreply@journeythroughpakistan.com" },
    fromName: { type: String, default: "Journey Through Pakistan" },
    enableSSL: { type: Boolean, default: true },
    
    // Auth0 Settings (if used)
    auth0Domain: { type: String, default: "" },
    auth0ClientId: { type: String, default: "" },
    auth0ClientSecret: { type: String, default: "" }, // Will be masked
    auth0CallbackUrl: { type: String, default: "" },
    
    // API Keys
    googleApiKey: { type: String, default: "" },
    textRazorApiKey: { type: String, default: "" }, // Will be masked
    googleVisionApiKey: { type: String, default: "" }, // Will be masked (optional, falls back to googleApiKey)
    googlePlacesApiKey: { type: String, default: "" }, // Will be masked (optional, falls back to googleApiKey)
    googleGeminiApiKey: { type: String, default: "" }, // Will be masked (optional, falls back to googleApiKey)
    
    // System Settings
    maintenanceMode: { type: Boolean, default: false },
    maxFileUploadSize: { type: Number, default: 10 },
    enableCaching: { type: Boolean, default: true },
    cacheDuration: { type: Number, default: 3600 },
    enableLogging: { type: Boolean, default: true },
    logLevel: { type: String, default: "info" },
    
    // API Settings
    enableAPI: { type: Boolean, default: true },
    apiRateLimit: { type: Number, default: 100 },
    apiKeyExpiry: { type: Number, default: 90 },
    
    // User Settings
    defaultRole: { type: String, default: "tourist" },
    allowProfileEdit: { type: Boolean, default: true },
    maxProfilePictureSize: { type: Number, default: 5 },
    enableFriendRequests: { type: Boolean, default: true },
    
    // Notification Settings
    enablePushNotifications: { type: Boolean, default: true },
    enableEmailNotifications: { type: Boolean, default: true },
    enableInAppNotifications: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;


import Settings from '../models/settings.models.js';

// Cache settings for performance
let settingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 minute

// Get settings with caching
export const getSettings = async () => {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (settingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return settingsCache;
  }
  
  // Fetch from database
  let settings = await Settings.findOne();
  if (!settings) {
    // Create default settings if none exist
    settings = await Settings.create({});
  }
  
  // Update cache
  settingsCache = settings;
  cacheTimestamp = now;
  
  return settings;
};

// Clear settings cache (call after updates)
export const clearSettingsCache = () => {
  settingsCache = null;
  cacheTimestamp = null;
};

// Check if registration is enabled
export const isRegistrationEnabled = async () => {
  const settings = await getSettings();
  return settings.enableRegistration !== false;
};

// Check if email verification is required
export const isEmailVerificationRequired = async () => {
  const settings = await getSettings();
  return settings.requireEmailVerification === true;
};

// Get default user role
export const getDefaultUserRole = async () => {
  const settings = await getSettings();
  return settings.defaultRole || 'tourist';
};

// Check password strength requirements
export const validatePassword = async (password) => {
  const settings = await getSettings();
  
  if (settings.requireStrongPassword) {
    const minLength = settings.minPasswordLength || 8;
    
    if (password.length < minLength) {
      return {
        valid: false,
        message: `Password must be at least ${minLength} characters long`
      };
    }
    
    // Check for strong password requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return {
        valid: false,
        message: 'Password must contain uppercase, lowercase, number, and special character'
      };
    }
  }
  
  return { valid: true };
};

// Check if maintenance mode is enabled
export const isMaintenanceMode = async () => {
  const settings = await getSettings();
  return settings.maintenanceMode === true;
};

// Get session timeout
export const getSessionTimeout = async () => {
  const settings = await getSettings();
  return (settings.sessionTimeout || 30) * 60 * 1000; // Convert to milliseconds
};

// Get max login attempts
export const getMaxLoginAttempts = async () => {
  const settings = await getSettings();
  return settings.maxLoginAttempts || 5;
};

// Get SMTP configuration
export const getSMTPConfig = async () => {
  const settings = await getSettings();
  return {
    host: settings.smtpHost || 'smtp.gmail.com',
    port: settings.smtpPort || 587,
    secure: settings.enableSSL !== false,
    auth: {
      user: settings.smtpUser || process.env.EMAIL,
      pass: settings.smtpPassword || process.env.PASSWORD
    }
  };
};

// Get email from settings
export const getEmailFrom = async () => {
  const settings = await getSettings();
  return {
    email: settings.fromEmail || process.env.EMAIL || 'noreply@journeythroughpakistan.com',
    name: settings.fromName || 'Journey Through Pakistan'
  };
};

// Check if profile editing is allowed
export const isProfileEditAllowed = async () => {
  const settings = await getSettings();
  return settings.allowProfileEdit !== false;
};

// Check if friend requests are enabled
export const areFriendRequestsEnabled = async () => {
  const settings = await getSettings();
  return settings.enableFriendRequests !== false;
};

// Get max profile picture size
export const getMaxProfilePictureSize = async () => {
  const settings = await getSettings();
  return (settings.maxProfilePictureSize || 5) * 1024 * 1024; // Convert to bytes
};

// Get max file upload size
export const getMaxFileUploadSize = async () => {
  const settings = await getSettings();
  return (settings.maxFileUploadSize || 10) * 1024 * 1024; // Convert to bytes
};

// Check notification settings
export const getNotificationSettings = async () => {
  const settings = await getSettings();
  return {
    push: settings.enablePushNotifications !== false,
    email: settings.enableEmailNotifications !== false,
    inApp: settings.enableInAppNotifications !== false,
    sound: settings.notificationSound !== false,
    quietHours: settings.quietHours === true,
    quietHoursStart: settings.quietHoursStart || '22:00',
    quietHoursEnd: settings.quietHoursEnd || '08:00'
  };
};

// Check if API is enabled
export const isAPIEnabled = async () => {
  const settings = await getSettings();
  return settings.enableAPI !== false;
};

// Get API rate limit
export const getAPIRateLimit = async () => {
  const settings = await getSettings();
  return settings.apiRateLimit || 100;
};

// Get Google API Key
export const getGoogleAPIKey = async () => {
  const settings = await getSettings();
  return settings.googleApiKey || process.env.GOOGLE_API_KEY || '';
};

// Get Google Vision API Key
export const getGoogleVisionAPIKey = async () => {
  const settings = await getSettings();
  return settings.googleVisionApiKey || process.env.GOOGLE_VISION_API_KEY || await getGoogleAPIKey();
};

// Get Google Places API Key
export const getGooglePlacesAPIKey = async () => {
  const settings = await getSettings();
  return settings.googlePlacesApiKey || process.env.GOOGLE_PLACES_API_KEY || await getGoogleAPIKey();
};


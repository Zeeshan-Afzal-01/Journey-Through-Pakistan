import Settings from '../models/settings.models.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { clearSettingsCache } from '../utils/settingsHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to encrypt sensitive data
const encrypt = (text) => {
  if (!text) return '';
  const algorithm = 'aes-256-cbc';
  const key = process.env.SECRET_KEY?.substring(0, 32) || 'default-key-32-characters-long!!';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Helper to decrypt sensitive data
const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  try {
    const algorithm = 'aes-256-cbc';
    const key = process.env.SECRET_KEY?.substring(0, 32) || 'default-key-32-characters-long!!';
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return '';
  }
};

// Mask sensitive values for display
const maskValue = (value) => {
  if (!value || value.length < 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
};

// Get all settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // If no settings exist, create from .env
    if (!settings) {
      settings = await createSettingsFromEnv();
    } else {
      // Update from .env if needed
      await syncWithEnv(settings);
    }
    
    // Mask sensitive fields
    const safeSettings = {
      ...settings.toObject(),
      secretKey: settings.secretKey ? maskValue(settings.secretKey) : '',
      mongodbUri: settings.mongodbUri ? maskValue(settings.mongodbUri) : '',
      smtpPassword: settings.smtpPassword ? maskValue(settings.smtpPassword) : '',
      auth0ClientSecret: settings.auth0ClientSecret ? maskValue(settings.auth0ClientSecret) : '',
      googleApiKey: settings.googleApiKey ? maskValue(settings.googleApiKey) : '',
      googleVisionApiKey: settings.googleVisionApiKey ? maskValue(settings.googleVisionApiKey) : '',
      googlePlacesApiKey: settings.googlePlacesApiKey ? maskValue(settings.googlePlacesApiKey) : '',
    };
    
    res.json(safeSettings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: "Failed to fetch settings", error: err.message });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await createSettingsFromEnv();
    }

    // Handle sensitive fields - if masked value is sent, don't update
    const sensitiveFields = ['secretKey', 'mongodbUri', 'smtpPassword', 'auth0ClientSecret', 'googleApiKey', 'googleVisionApiKey', 'googlePlacesApiKey'];
    sensitiveFields.forEach(field => {
      if (updates[field] && updates[field].includes('••••')) {
        delete updates[field]; // Don't update if masked
      }
    });

    // Update settings
    Object.keys(updates).forEach(key => {
      if (settings.schema.paths[key]) {
        settings[key] = updates[key];
      }
    });

    await settings.save();

    // Clear settings cache
    clearSettingsCache();

    // Update .env file
    await updateEnvFile(settings);

    // Log security event (CRITICAL - settings change)
    try {
      const { createSecurityLog } = await import('./securityLogController.js');
      const { getClientIP } = await import('../utils/getClientIP.js');
      const changedFields = Object.keys(updates).filter(key => 
        !['secretKey', 'mongodbUri', 'smtpPassword', 'auth0ClientSecret', 'googleApiKey', 'googleVisionApiKey', 'googlePlacesApiKey'].includes(key) ||
        !String(updates[key]).includes('••••')
      );
      
      await createSecurityLog({
        eventType: 'settings_change',
        adminId: adminId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        description: `Settings updated: ${changedFields.length} field(s) changed`,
        severity: changedFields.some(f => ['maintenanceMode', 'enableRegistration', 'requireEmailVerification'].includes(f)) ? 'high' : 'medium',
        status: 'success',
        details: {
          changedFields: changedFields,
          changedCount: changedFields.length
        }
      });
    } catch (logError) {
      console.error('Error logging settings change:', logError);
    }

    // Mask sensitive fields in response
    const safeSettings = {
      ...settings.toObject(),
      secretKey: settings.secretKey ? maskValue(settings.secretKey) : '',
      mongodbUri: settings.mongodbUri ? maskValue(settings.mongodbUri) : '',
      smtpPassword: settings.smtpPassword ? maskValue(settings.smtpPassword) : '',
      auth0ClientSecret: settings.auth0ClientSecret ? maskValue(settings.auth0ClientSecret) : '',
      googleApiKey: settings.googleApiKey ? maskValue(settings.googleApiKey) : '',
      googleVisionApiKey: settings.googleVisionApiKey ? maskValue(settings.googleVisionApiKey) : '',
      googlePlacesApiKey: settings.googlePlacesApiKey ? maskValue(settings.googlePlacesApiKey) : '',
    };

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: safeSettings
    });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ message: "Failed to update settings", error: err.message });
  }
};

// Create settings from .env file
const createSettingsFromEnv = async () => {
  const envPath = path.join(__dirname, '..', '.env');
  let envVars = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }

  const settingsData = {
    appName: envVars.APP_NAME || "Journey Through Pakistan",
    appUrl: envVars.APP_URL || "https://journeythroughpakistan.com",
    timezone: envVars.TIMEZONE || "Asia/Karachi",
    language: envVars.LANGUAGE || "en",
    dateFormat: envVars.DATE_FORMAT || "DD/MM/YYYY",
    port: parseInt(envVars.PORT) || 3000,
    nodeEnv: envVars.NODE_ENV || "development",
    frontendUrl: envVars.FRONTEND_URL || "http://localhost:5173",
    mongodbUri: envVars.MONGODB_URI || envVars.URL || "",
    secretKey: envVars.SECRET_KEY || "",
    smtpHost: envVars.SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(envVars.SMTP_PORT) || 587,
    smtpUser: envVars.SMTP_USER || envVars.EMAIL || "",
    smtpPassword: envVars.SMTP_PASSWORD || envVars.PASSWORD || "",
    fromEmail: envVars.FROM_EMAIL || "noreply@journeythroughpakistan.com",
    fromName: envVars.FROM_NAME || "Journey Through Pakistan",
    enableSSL: envVars.SMTP_SSL === 'true' || true,
    auth0Domain: envVars.AUTH0_DOMAIN || "",
    auth0ClientId: envVars.AUTH0_CLIENT_ID || "",
    auth0ClientSecret: envVars.AUTH0_CLIENT_SECRET || "",
    auth0CallbackUrl: envVars.AUTH0_CALLBACK_URL || "",
    googleApiKey: envVars.GOOGLE_API_KEY || "",
    googleVisionApiKey: envVars.GOOGLE_VISION_API_KEY || "",
    googlePlacesApiKey: envVars.GOOGLE_PLACES_API_KEY || "",
  };

  return await Settings.create(settingsData);
};

// Sync settings with .env file
const syncWithEnv = async (settings) => {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });

  // Update settings from env if they're different
  let updated = false;
  if (envVars.PORT && parseInt(envVars.PORT) !== settings.port) {
    settings.port = parseInt(envVars.PORT);
    updated = true;
  }
  if (envVars.NODE_ENV && envVars.NODE_ENV !== settings.nodeEnv) {
    settings.nodeEnv = envVars.NODE_ENV;
    updated = true;
  }
  if (envVars.FRONTEND_URL && envVars.FRONTEND_URL !== settings.frontendUrl) {
    settings.frontendUrl = envVars.FRONTEND_URL;
    updated = true;
  }

  if (updated) {
    await settings.save();
  }
};

// Update .env file
const updateEnvFile = async (settings) => {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    // Create .env file if it doesn't exist
    fs.writeFileSync(envPath, '');
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const envVars = new Map();
  const comments = [];
  
  // Parse existing .env - preserve structure
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#')) {
      comments.push({ line, index });
    } else if (trimmedLine && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const keyTrimmed = key.trim();
      if (keyTrimmed) {
        envVars.set(keyTrimmed, {
          value: valueParts.join('=').trim().replace(/^["']|["']$/g, ''),
          originalLine: line,
          index
        });
      }
    }
  });

  // Update env vars from settings (only if not masked)
  const updateEnvVar = (key, value) => {
    if (value !== undefined && value !== null && value !== '' && !String(value).includes('••••')) {
      envVars.set(key, {
        value: String(value),
        originalLine: `${key}=${value}`,
        index: -1
      });
    }
  };

  // Map settings to .env variables
  updateEnvVar('APP_NAME', settings.appName);
  updateEnvVar('APP_URL', settings.appUrl);
  updateEnvVar('TIMEZONE', settings.timezone);
  updateEnvVar('LANGUAGE', settings.language);
  updateEnvVar('DATE_FORMAT', settings.dateFormat);
  updateEnvVar('PORT', settings.port);
  updateEnvVar('NODE_ENV', settings.nodeEnv);
  updateEnvVar('FRONTEND_URL', settings.frontendUrl);
  updateEnvVar('SMTP_HOST', settings.smtpHost);
  updateEnvVar('SMTP_PORT', settings.smtpPort);
  updateEnvVar('EMAIL', settings.smtpUser); // Maps to EMAIL in sendOTP
  updateEnvVar('PASSWORD', settings.smtpPassword); // Maps to PASSWORD in sendOTP
  updateEnvVar('SMTP_USER', settings.smtpUser);
  updateEnvVar('SMTP_PASSWORD', settings.smtpPassword);
  updateEnvVar('FROM_EMAIL', settings.fromEmail);
  updateEnvVar('FROM_NAME', settings.fromName);
  updateEnvVar('SMTP_SSL', settings.enableSSL);
  updateEnvVar('AUTH0_DOMAIN', settings.auth0Domain);
  updateEnvVar('AUTH0_CLIENT_ID', settings.auth0ClientId);
  updateEnvVar('AUTH0_CLIENT_SECRET', settings.auth0ClientSecret);
  updateEnvVar('AUTH0_CALLBACK_URL', settings.auth0CallbackUrl);
  updateEnvVar('GOOGLE_API_KEY', settings.googleApiKey);
  updateEnvVar('GOOGLE_VISION_API_KEY', settings.googleVisionApiKey);
  updateEnvVar('GOOGLE_PLACES_API_KEY', settings.googlePlacesApiKey);
  updateEnvVar('SECRET_KEY', settings.secretKey);
  updateEnvVar('MONGODB_URI', settings.mongodbUri);
  updateEnvVar('URL', settings.mongodbUri); // Also update URL if used

  // Rebuild .env file
  const newLines = [];
  
  // Add comments first
  comments.forEach(comment => {
    newLines.push(comment.line);
  });
  
  // Add blank line if comments exist
  if (comments.length > 0) {
    newLines.push('');
  }
  
  // Add all env vars
  Array.from(envVars.entries()).forEach(([key, data]) => {
    newLines.push(`${key}=${data.value}`);
  });

  // Write back to .env file
  fs.writeFileSync(envPath, newLines.join('\n') + '\n');
};


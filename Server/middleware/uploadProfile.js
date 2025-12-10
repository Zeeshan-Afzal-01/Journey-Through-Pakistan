import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMaxProfilePictureSize } from '../utils/settingsHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (file.fieldname === 'profilePicture') {
      uploadPath = path.join(__dirname, "..", "uploads", "profiles");
    } else if (file.fieldname === 'coverPhoto') {
      uploadPath = path.join(__dirname, "..", "uploads", "covers");
    } else {
      uploadPath = path.join(__dirname, "..", "uploads", "profiles");
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${ts}-${safeOriginal}`);
  }
});

// Default to 5MB if settings not available
const defaultMaxSize = 5 * 1024 * 1024;

// Create upload middleware with dynamic file size limit
const createUploadProfile = async () => {
  try {
    const maxSize = await getMaxProfilePictureSize();
    return multer({ 
      storage,
      limits: { fileSize: maxSize || defaultMaxSize },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
  } catch (error) {
    console.error('Error getting max profile picture size:', error);
    return multer({ 
      storage,
      limits: { fileSize: defaultMaxSize },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      }
    });
  }
};

// Export middleware factory
export default createUploadProfile;


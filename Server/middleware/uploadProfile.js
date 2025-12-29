import multer from 'multer';
import { getMaxProfilePictureSize } from '../utils/settingsHelper.js';

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

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


import multer from 'multer';
import { getMaxFileUploadSize } from '../utils/settingsHelper.js';

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const defaultMaxSize = 10 * 1024 * 1024; // 10MB default

const createUploadPost = async () => {
  try {
    const maxSize = await getMaxFileUploadSize();
    return multer({ 
      storage,
      limits: { fileSize: maxSize || defaultMaxSize },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image and video files are allowed'), false);
        }
      }
    });
  } catch (error) {
    console.error('Error getting max file upload size:', error);
    return multer({ 
      storage,
      limits: { fileSize: defaultMaxSize },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image and video files are allowed'), false);
        }
      }
    });
  }
};

export default createUploadPost;



import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMaxFileUploadSize } from '../utils/settingsHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads", "posts");
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
      limits: { fileSize: defaultMaxSize }
    });
  }
};

export default createUploadPost;



import multer from 'multer';

const storage = multer.memoryStorage(); // Store in memory for processing

const uploadLandmark = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for landmark images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

export default uploadLandmark;


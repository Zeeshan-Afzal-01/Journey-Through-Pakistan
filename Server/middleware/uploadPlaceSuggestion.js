import multer from "multer";

const storage = multer.memoryStorage();

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function fileFilter(req, file, cb) {
  const isImage = file.mimetype?.startsWith("image/");
  const isVideo = file.mimetype?.startsWith("video/");

  if (!isImage && !isVideo) {
    return cb(new Error("Only image/video files are allowed"), false);
  }

  cb(null, true);
}

export const uploadPlaceSuggestion = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // upper bound (we still validate per-type below)
    files: 7, // images(5) + videos(2)
  },
}).fields([
  { name: "images", maxCount: 5 },
  { name: "videos", maxCount: 2 },
]);

export function validatePlaceSuggestionFiles(req, res, next) {
  try {
    const images = req.files?.images || [];
    const videos = req.files?.videos || [];

    for (const f of images) {
      if (!f.mimetype?.startsWith("image/")) {
        return res.status(400).json({ message: "Invalid image file" });
      }
      if (f.size > MAX_IMAGE_SIZE) {
        return res.status(400).json({ message: "Image too large (max 5MB)" });
      }
    }

    for (const f of videos) {
      if (!f.mimetype?.startsWith("video/")) {
        return res.status(400).json({ message: "Invalid video file" });
      }
      if (f.size > MAX_VIDEO_SIZE) {
        return res.status(400).json({ message: "Video too large (max 50MB)" });
      }
    }

    next();
  } catch (e) {
    next(e);
  }
}



import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createPost, listPosts, getPost, toggleLike, addComment, sharePost, trendingHashtags, updatePost, deletePost, toggleSavePost, getSavedPosts } from '../controller/postController.js';
import { reportPost, reportComment } from '../controller/reportController.js';
import uploadPost from '../middleware/uploadPost.js';

const router = express.Router();

// Helper to wrap async middleware
const asyncMiddleware = (fn) => {
  return async (req, res, next) => {
    try {
      const middleware = await fn();
      if (typeof middleware === 'function') {
        middleware(req, res, next);
      } else {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

router.get('/', verifyToken, listPosts);
router.get('/saved', verifyToken, getSavedPosts);
router.post('/', verifyToken, asyncMiddleware(async () => {
  const upload = await uploadPost();
  return upload.single('image');
}), createPost);
router.get('/trending-hashtags', verifyToken, trendingHashtags);
router.get('/:id', verifyToken, getPost);
router.put('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/like', verifyToken, toggleLike);
router.post('/:id/comment', verifyToken, addComment);
router.post('/:id/share', verifyToken, sharePost);
router.post('/:id/save', verifyToken, toggleSavePost);
router.post('/:postId/report', verifyToken, reportPost);
router.post('/:postId/comment/:commentId/report', verifyToken, reportComment);


export default router;



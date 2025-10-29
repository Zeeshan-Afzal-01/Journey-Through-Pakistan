import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createPost, listPosts, getPost, toggleLike, addComment, sharePost } from '../controller/postController.js';
import uploadPost from '../middleware/uploadPost.js';

const router = express.Router();

router.get('/', verifyToken, listPosts);
router.post('/', verifyToken, uploadPost.single('image'), createPost);
router.get('/:id', verifyToken, getPost);
router.post('/:id/like', verifyToken, toggleLike);
router.post('/:id/comment', verifyToken, addComment);
router.post('/:id/share', verifyToken, sharePost);

export default router;



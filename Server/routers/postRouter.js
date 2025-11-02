import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createPost, listPosts, getPost, toggleLike, addComment, sharePost, trendingHashtags, updatePost, deletePost } from '../controller/postController.js';
import uploadPost from '../middleware/uploadPost.js';

const router = express.Router();

router.get('/', verifyToken, listPosts);
router.post('/', verifyToken, uploadPost.single('image'), createPost);
router.get('/trending-hashtags', verifyToken, trendingHashtags);
router.get('/:id', verifyToken, getPost);
router.put('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/like', verifyToken, toggleLike);
router.post('/:id/comment', verifyToken, addComment);
router.post('/:id/share', verifyToken, sharePost);


export default router;



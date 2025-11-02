import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import uploadStatus from '../middleware/uploadStatus.js';
import { createStatus, listActiveStatuses, getUserStatuses, markViewed, addReaction, removeReaction, addMessage } from '../controller/statusController.js';

const router = express.Router();

router.get('/', verifyToken, listActiveStatuses);
router.post('/', verifyToken, uploadStatus.single('media'), createStatus);
router.get('/user/:userId', verifyToken, getUserStatuses);
router.post('/:id/view', verifyToken, markViewed);
router.post('/:id/reaction', verifyToken, addReaction);
router.delete('/:id/reaction', verifyToken, removeReaction);
router.post('/:id/message', verifyToken, addMessage);

export default router;



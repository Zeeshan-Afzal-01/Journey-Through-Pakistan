import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import uploadStatus from '../middleware/uploadStatus.js';
import { createStatus, listActiveStatuses, getUserStatuses, markViewed } from '../controller/statusController.js';

const router = express.Router();

router.get('/', verifyToken, listActiveStatuses);
router.post('/', verifyToken, uploadStatus.single('media'), createStatus);
router.get('/user/:userId', verifyToken, getUserStatuses);
router.post('/:id/view', verifyToken, markViewed);

export default router;



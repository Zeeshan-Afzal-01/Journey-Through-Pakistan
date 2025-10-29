import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { listMyNotifications, markAllRead } from '../controller/notificationController.js';

const router = express.Router();

router.get('/', verifyToken, listMyNotifications);
router.post('/read-all', verifyToken, markAllRead);

export default router;



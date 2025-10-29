import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { listMyNotifications, markAllRead, listActivity } from '../controller/notificationController.js';

const router = express.Router();

router.get('/', verifyToken, listMyNotifications);
router.post('/read-all', verifyToken, markAllRead);
router.get('/activity', verifyToken, listActivity);

export default router;



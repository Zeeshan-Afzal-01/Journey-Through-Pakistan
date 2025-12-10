import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import uploadStatus from '../middleware/uploadStatus.js';
import { createStatus, listActiveStatuses, getUserStatuses, markViewed, addReaction, removeReaction, addMessage } from '../controller/statusController.js';

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

router.get('/', verifyToken, listActiveStatuses);
router.post('/', verifyToken, asyncMiddleware(async () => {
  const upload = await uploadStatus();
  return upload.single('media');
}), createStatus);
router.get('/user/:userId', verifyToken, getUserStatuses);
router.post('/:id/view', verifyToken, markViewed);
router.post('/:id/reaction', verifyToken, addReaction);
router.delete('/:id/reaction', verifyToken, removeReaction);
router.post('/:id/message', verifyToken, addMessage);

export default router;



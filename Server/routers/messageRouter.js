import express from 'express';
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  markMessagesAsRead,
  getUnreadCount,
  uploadChatImage,
  getLocalChats,
  deleteConversation,
  deleteMultipleConversations
} from '../controller/messageController.js';
import { verifyToken } from '../middleware/auth.js';
import uploadChat from '../middleware/uploadChat.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get('/conversations', getConversations);
router.get('/conversation/:userId', getOrCreateConversation);
router.get('/conversation/:conversationId/messages', getMessages);
router.put('/conversation/:conversationId/read', markMessagesAsRead);
router.get('/unread-count', getUnreadCount);
router.get('/local-chats', getLocalChats);
router.post('/upload-image', uploadChat.single('image'), uploadChatImage);

// Delete conversation routes
router.delete('/conversation/:conversationId', deleteConversation);
router.delete('/conversations', deleteMultipleConversations);

export default router;


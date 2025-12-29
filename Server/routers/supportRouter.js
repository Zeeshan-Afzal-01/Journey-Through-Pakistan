import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { escalateToAdmin, getMyTickets } from '../controller/supportController.js';

const router = express.Router();

/**
 * POST /support/escalate
 * Escalate an issue to admin team
 */
router.post('/escalate', verifyToken, escalateToAdmin);

/**
 * GET /support/my-tickets
 * Get user's support tickets
 */
router.get('/my-tickets', verifyToken, getMyTickets);

export default router;


import express from 'express';
import { generateGeminiContent } from '../controller/geminiController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /gemini/generate
 * Generate content using Google Gemini API (requires authentication)
 */
router.post('/generate', verifyToken, generateGeminiContent);

export default router;


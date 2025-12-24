import express from 'express';
import { identifyLandmark, getNearbyPlaces } from '../controller/landmarkController.js';
import uploadLandmark from '../middleware/uploadLandmark.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /landmarks/nearby
 * Get nearby places based on GPS coordinates
 * 
 * Query params:
 * - lat: Latitude (number)
 * - lng: Longitude (number)
 * 
 * Response:
 * {
 *   success: boolean,
 *   places: [
 *     {
 *       name: string,
 *       place_id: string,
 *       location: { lat: number, lng: number },
 *       distance: number,
 *       address: string,
 *       types: string[],
 *       rating: number,
 *       photo_url: string
 *     }
 *   ]
 * }
 */
router.get(
  '/nearby',
  verifyToken, // Require authentication
  getNearbyPlaces
);

/**
 * POST /landmarks/identify
 * Identify landmark from image and GPS coordinates
 * 
 * Body:
 * - image: Image file (multipart/form-data)
 * - lat: Latitude (number)
 * - lng: Longitude (number)
 * 
 * Response:
 * {
 *   landmark_found: boolean,
 *   name: string,
 *   place_id: string,
 *   location: { lat: number, lng: number },
 *   confidence: number,
 *   distance: number,
 *   address: string,
 *   types: string[],
 *   rating: number,
 *   labels: string[]
 * }
 * 
 * OR (fallback):
 * {
 *   landmark_found: false,
 *   nearest_places: [...]
 * }
 */
router.post(
  '/identify',
  verifyToken, // Require authentication
  uploadLandmark.single('image'),
  identifyLandmark
);

export default router;


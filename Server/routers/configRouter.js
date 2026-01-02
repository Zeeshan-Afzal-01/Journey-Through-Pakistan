import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getGoogleMapsPublicKey } from "../controller/configController.js";

const router = express.Router();

// GET /api/config/google-maps-key
// Public endpoint - no auth required for Google Maps key (it's a public key anyway)
router.get("/google-maps-key", getGoogleMapsPublicKey);

export default router;



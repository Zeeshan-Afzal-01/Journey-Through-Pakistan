import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getGoogleMapsPublicKey } from "../controller/configController.js";

const router = express.Router();

// GET /api/config/google-maps-key
router.get("/google-maps-key", verifyToken, getGoogleMapsPublicKey);

export default router;



import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getRecommendations } from "../controller/recommendationController.js";

const router = express.Router();

// GET /api/recommendations?lat=...&lng=...
router.get("/", verifyToken, getRecommendations);

export default router;



import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getSavedPlaces,
  getMyPlaceSuggestions,
  getVisitedPlaces,
  markPlaceVisited,
  submitPlaceSuggestion,
  toggleSavePlace,
} from "../controller/placeController.js";
import { uploadPlaceSuggestion, validatePlaceSuggestionFiles } from "../middleware/uploadPlaceSuggestion.js";

const router = express.Router();

// POST /api/places/suggest (local users)
router.post("/suggest", verifyToken, uploadPlaceSuggestion, validatePlaceSuggestionFiles, submitPlaceSuggestion);

// GET /api/places/my-suggestions
router.get("/my-suggestions", verifyToken, getMyPlaceSuggestions);

// GET /api/places/saved
router.get("/saved", verifyToken, getSavedPlaces);

// GET /api/places/visited
router.get("/visited", verifyToken, getVisitedPlaces);

// POST /api/places/:placeId/visit
router.post("/:placeId/visit", verifyToken, markPlaceVisited);

// POST /api/places/:placeId/save
router.post("/:placeId/save", verifyToken, toggleSavePlace);

export default router;



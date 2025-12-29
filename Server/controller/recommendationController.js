import { getPersonalizedRecommendations } from "../services/recommendationService.js";

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const lat = parseNumber(req.query.lat);
    const lng = parseNumber(req.query.lng);

    const latProvided = lat !== null;
    const lngProvided = lng !== null;

    if ((latProvided && Number.isNaN(lat)) || (lngProvided && Number.isNaN(lng))) {
      return res.status(400).json({ message: "Invalid lat/lng query params" });
    }

    // Only use location if both are provided and within valid ranges.
    let userLocation = null;
    if (latProvided || lngProvided) {
      if (lat === null || lng === null) {
        return res.status(400).json({ message: "Both lat and lng are required" });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: "lat/lng out of range" });
      }
      userLocation = { latitude: lat, longitude: lng };
    }

    const recommendations = await getPersonalizedRecommendations(userId, userLocation);

    return res.json({
      reason: "Based on your interests and nearby location",
      recommendations,
    });
  } catch (error) {
    console.error("Error generating personalized recommendations:", error);
    return res.status(500).json({ message: "Failed to generate recommendations" });
  }
};



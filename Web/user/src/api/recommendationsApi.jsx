import api from "./api.jsx";

// GET /api/recommendations?lat=...&lng=...
export const getPersonalizedRecommendations = (params = {}) =>
  api.get("/api/recommendations", { params });



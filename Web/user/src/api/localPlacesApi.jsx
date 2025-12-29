import api from "./api.jsx";

export const submitPlaceSuggestion = (formData) =>
  api.post("/api/places/suggest", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMyPlaceSuggestions = () => api.get("/api/places/my-suggestions");



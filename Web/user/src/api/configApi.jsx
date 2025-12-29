import api from "./api.jsx";

export const getGoogleMapsKey = () => api.get("/api/config/google-maps-key");



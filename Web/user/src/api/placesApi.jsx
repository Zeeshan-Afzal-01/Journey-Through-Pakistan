import api from "./api.jsx";

export const markPlaceVisited = (placeId) => api.post(`/api/places/${placeId}/visit`);

export const toggleSavePlace = (placeId) => api.post(`/api/places/${placeId}/save`);

export const getSavedPlaces = () => api.get("/api/places/saved");

export const getVisitedPlaces = () => api.get("/api/places/visited");



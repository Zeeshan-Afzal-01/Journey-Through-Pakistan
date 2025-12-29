import api from "./api.jsx";

/**
 * Identify landmark from image and GPS coordinates
 * @param {File} imageFile - Image file to identify
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} API response
 */
export const identifyLandmark = (imageFile, lat, lng) => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("lat", lat.toString());
  formData.append("lng", lng.toString());

  return api.post("/landmarks/identify", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Get nearby places based on GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} API response
 */
export const getNearbyPlaces = (lat, lng) => {
  return api.get("/landmarks/nearby", {
    params: {
      lat: lat.toString(),
      lng: lng.toString(),
    },
  });
};

/**
 * Get landmark by ID (public - no authentication required)
 * @param {string} landmarkId - Landmark ID
 * @returns {Promise} API response
 */
export const getLandmarkById = (landmarkId) => {
  return api.get(`/landmarks/${landmarkId}`);
};

/**
 * Get user's landmark search count (requires authentication)
 * @returns {Promise} API response
 */
export const getUserLandmarkCount = () => {
  return api.get("/landmarks/user/count");
};

/**
 * Get place photos from Google Places API (public - no authentication required)
 * @param {string} placeId - Place ID from Google Places
 * @returns {Promise} API response
 */
export const getPlacePhotos = (placeId) => {
  return api.get(`/landmarks/place/${placeId}/photos`);
};

/**
 * Get nearby places for landmark result (public - no authentication required)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} API response
 */
export const getNearbyPlacesForLandmark = (lat, lng) => {
  return api.get("/landmarks/nearby-for-landmark", {
    params: {
      lat: lat.toString(),
      lng: lng.toString(),
    },
  });
};


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


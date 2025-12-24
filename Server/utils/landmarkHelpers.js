/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Sort places by distance from user location
 * @param {Array} places - Array of place objects with location
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @returns {Array} Sorted array of places
 */
export const sortPlacesByDistance = (places, userLat, userLng) => {
  return places.map(place => {
    const placeLat = place.geometry?.location?.lat || place.location?.lat;
    const placeLng = place.geometry?.location?.lng || place.location?.lng;
    
    if (placeLat && placeLng) {
      place.distance = calculateDistance(userLat, userLng, placeLat, placeLng);
    } else {
      place.distance = Infinity; // If no location, put at end
    }
    
    return place;
  }).sort((a, b) => a.distance - b.distance);
};

/**
 * Convert image buffer to base64
 * @param {Buffer} buffer - Image buffer
 * @returns {string} Base64 encoded string
 */
export const bufferToBase64 = (buffer) => {
  return buffer.toString('base64');
};

/**
 * Popular Pakistani landmarks cache (for faster recognition)
 */
export const POPULAR_LANDMARKS = {
  'Minar-e-Pakistan': { lat: 31.5925, lng: 74.3095 },
  'Lahore Fort': { lat: 31.5889, lng: 74.3103 },
  'Badshahi Mosque': { lat: 31.5880, lng: 74.3103 },
  'Faisal Mosque': { lat: 33.7294, lng: 73.0386 },
  'Pakistan Monument': { lat: 33.6938, lng: 73.0682 },
  'Mazar-e-Quaid': { lat: 24.8747, lng: 67.0404 },
  'University of Central Punjab': { lat: 31.4700, lng: 74.2600 },
  'UCP': { lat: 31.4700, lng: 74.2600 }
};


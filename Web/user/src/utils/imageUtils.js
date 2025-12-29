/**
 * Get the full image URL
 * If the URL is already a full URL (http/https), return it as-is
 * Otherwise, prepend the local server URL
 * @param {string} imageUrl - The image URL from the database
 * @returns {string} - The full image URL
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL (Cloudinary or external), return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Otherwise, prepend local server URL (for backward compatibility with local files)
  return `http://localhost:3000/${imageUrl}`;
};

/**
 * Get profile picture URL with fallback
 * @param {string} profilePicture - Profile picture URL
 * @param {boolean} hasProfilePicture - Whether profile picture exists
 * @returns {string} - Profile picture URL or default avatar
 */
export const getProfilePictureUrl = (profilePicture, hasProfilePicture) => {
  if (hasProfilePicture && profilePicture) {
    return getImageUrl(profilePicture);
  }
  return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
};


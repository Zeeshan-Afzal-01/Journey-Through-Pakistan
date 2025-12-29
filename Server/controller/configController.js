import { getGooglePlacesAPIKey } from "../utils/settingsHelper.js";

/**
 * Returns a client-usable Google Maps/Places key.
 * NOTE: Any browser key is inherently public. Restrict this key by HTTP referrers in Google Cloud Console.
 */
export const getGoogleMapsPublicKey = async (req, res) => {
  try {
    const key = await getGooglePlacesAPIKey();
    return res.json({ key: key || "" });
  } catch (error) {
    console.error("Error getting Google Maps public key:", error);
    return res.status(500).json({ message: "Failed to load maps key" });
  }
};



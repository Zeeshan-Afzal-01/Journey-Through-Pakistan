import mongoose from "mongoose";
import User from "../models/user.models.js";
import Place from "../models/place.models.js";

const PLACE_PUBLIC_FIELDS =
  "name address description estimatedCost rating popularityScore tags latitude longitude location types media";

const ALLOWED_INTEREST_TAGS = new Set(["history", "nature", "culture", "food", "adventure"]);

function normalizeTags(input) {
  let arr = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) arr = [];
    else {
      try {
        arr = JSON.parse(trimmed);
      } catch {
        arr = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
  }
  if (!Array.isArray(arr)) arr = [];
  const out = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const t = v.trim().toLowerCase();
    if (!t) continue;
    if (!ALLOWED_INTEREST_TAGS.has(t)) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

export const markPlaceVisited = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const placeExists = await Place.exists({ _id: placeId });
    if (!placeExists) return res.status(404).json({ message: "Place not found" });

    const updated = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { visitedPlaces: placeId } },
      { new: true }
    ).select("visitedPlaces savedPlaces");

    return res.json({
      message: "Place marked as visited",
      visitedPlaces: updated?.visitedPlaces || [],
    });
  } catch (error) {
    console.error("Error marking place visited:", error);
    return res.status(500).json({ message: "Failed to mark place visited" });
  }
};

export const toggleSavePlace = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { placeId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const placeExists = await Place.exists({ _id: placeId });
    if (!placeExists) return res.status(404).json({ message: "Place not found" });

    const user = await User.findById(userId).select("savedPlaces").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadySaved = Array.isArray(user.savedPlaces)
      ? user.savedPlaces.some((id) => id.toString() === placeId)
      : false;

    const update = alreadySaved
      ? { $pull: { savedPlaces: placeId } }
      : { $addToSet: { savedPlaces: placeId } };

    const updated = await User.findByIdAndUpdate(userId, update, { new: true })
      .select("savedPlaces")
      .lean();

    return res.json({
      message: alreadySaved ? "Place removed from saved" : "Place saved",
      savedPlaces: updated?.savedPlaces || [],
      saved: !alreadySaved,
    });
  } catch (error) {
    console.error("Error toggling saved place:", error);
    return res.status(500).json({ message: "Failed to update saved places" });
  }
};

export const getSavedPlaces = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("savedPlaces").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const ids = Array.isArray(user.savedPlaces) ? user.savedPlaces : [];
    if (ids.length === 0) return res.json({ places: [] });

    const places = await Place.find({ _id: { $in: ids } })
      .select(PLACE_PUBLIC_FIELDS)
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ places });
  } catch (error) {
    console.error("Error fetching saved places:", error);
    return res.status(500).json({ message: "Failed to fetch saved places" });
  }
};

export const getVisitedPlaces = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("visitedPlaces").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const ids = Array.isArray(user.visitedPlaces) ? user.visitedPlaces : [];
    if (ids.length === 0) return res.json({ places: [] });

    const places = await Place.find({ _id: { $in: ids } })
      .select(PLACE_PUBLIC_FIELDS)
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ places });
  } catch (error) {
    console.error("Error fetching visited places:", error);
    return res.status(500).json({ message: "Failed to fetch visited places" });
  }
};

export const submitPlaceSuggestion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select("role").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "local") {
      return res.status(403).json({ message: "Only local users can submit place suggestions" });
    }

    const {
      name,
      address,
      latitude,
      longitude,
      estimatedCost,
      description,
      tags,
    } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return res.status(400).json({ message: "Place name is required (min 3 chars)" });
    }

    const lat = latitude !== undefined ? Number(latitude) : null;
    const lng = longitude !== undefined ? Number(longitude) : null;
    const hasLatLng = Number.isFinite(lat) && Number.isFinite(lng);
    if (hasLatLng) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: "Invalid latitude/longitude" });
      }
    }

    const cost = estimatedCost !== undefined ? Number(estimatedCost) : 0;
    if (!Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({ message: "Invalid estimatedCost" });
    }

    const normalizedTags = normalizeTags(tags);
    if (normalizedTags.length === 0) {
      return res.status(400).json({ message: "Select at least one interest tag" });
    }

    const desc =
      typeof description === "string" ? description.trim().slice(0, 2000) : undefined;

    // Upload media (best effort)
    const media = [];
    try {
      const { uploadToCloudinary } = await import("../utils/cloudinary.js");
      const images = req.files?.images || [];
      const videos = req.files?.videos || [];

      const imageUploads = images.map(async (f) => {
        const up = await uploadToCloudinary(f.buffer, "jtp/place_suggestions/images", "image");
        return { url: up.url, publicId: up.publicId, type: "image" };
      });

      const videoUploads = videos.map(async (f) => {
        const up = await uploadToCloudinary(f.buffer, "jtp/place_suggestions/videos", "video");
        return { url: up.url, publicId: up.publicId, type: "video" };
      });

      const uploaded = await Promise.all([...imageUploads, ...videoUploads]);
      media.push(...uploaded);
    } catch (mediaError) {
      // Do not fail the request if media upload fails
      console.error("Place suggestion media upload failed:", mediaError.message);
    }

    const doc = {
      name: name.trim(),
      address: typeof address === "string" ? address.trim() : undefined,
      description: desc,
      tags: normalizedTags,
      estimatedCost: cost,
      media,
      submittedBy: userId,
      status: "pending",
    };

    if (hasLatLng) {
      doc.latitude = lat;
      doc.longitude = lng;
      doc.location = { type: "Point", coordinates: [lng, lat] };
    }

    const created = await Place.create(doc);

    return res.status(201).json({
      message: "Suggestion submitted for admin approval",
      place: {
        _id: created._id,
        name: created.name,
        status: created.status,
      },
    });
  } catch (error) {
    console.error("Error submitting place suggestion:", error);
    return res.status(500).json({ message: "Failed to submit suggestion" });
  }
};

export const getMyPlaceSuggestions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const places = await Place.find({ submittedBy: userId })
      .select("name address tags estimatedCost status rejectionReason createdAt updatedAt media description")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ places });
  } catch (error) {
    console.error("Error fetching my place suggestions:", error);
    return res.status(500).json({ message: "Failed to fetch your suggestions" });
  }
};



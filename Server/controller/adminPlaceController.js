import mongoose from "mongoose";
import Place from "../models/place.models.js";

const ADMIN_PLACE_FIELDS =
  "name address description media tags estimatedCost rating popularityScore status submittedBy reviewedBy reviewedAt rejectionReason createdAt";

export const getPendingPlaces = async (req, res) => {
  try {
    const places = await Place.find({ status: "pending" })
      .select(ADMIN_PLACE_FIELDS)
      .populate("submittedBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ places });
  } catch (error) {
    console.error("Error fetching pending places:", error);
    return res.status(500).json({ message: "Failed to fetch pending places" });
  }
};

export const approvePlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const updated = await Place.findByIdAndUpdate(
      placeId,
      {
        $set: {
          status: "approved",
          reviewedBy: req.user?._id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      },
      { new: true }
    ).select(ADMIN_PLACE_FIELDS);

    if (!updated) return res.status(404).json({ message: "Place not found" });

    return res.json({ message: "Place approved", place: updated });
  } catch (error) {
    console.error("Error approving place:", error);
    return res.status(500).json({ message: "Failed to approve place" });
  }
};

export const rejectPlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    const { reason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ message: "Invalid placeId" });
    }

    const updated = await Place.findByIdAndUpdate(
      placeId,
      {
        $set: {
          status: "rejected",
          reviewedBy: req.user?._id,
          reviewedAt: new Date(),
          rejectionReason: typeof reason === "string" ? reason.trim() : "Rejected by admin",
        },
      },
      { new: true }
    ).select(ADMIN_PLACE_FIELDS);

    if (!updated) return res.status(404).json({ message: "Place not found" });

    return res.json({ message: "Place rejected", place: updated });
  } catch (error) {
    console.error("Error rejecting place:", error);
    return res.status(500).json({ message: "Failed to reject place" });
  }
};



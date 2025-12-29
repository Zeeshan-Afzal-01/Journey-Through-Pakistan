import mongoose from "mongoose";

const landmarkSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    landmark_found: {
      type: Boolean,
      default: false
    },
    name: {
      type: String
    },
    place_id: {
      type: String,
      index: true
    },
    location: {
      lat: Number,
      lng: Number
    },
    confidence: {
      type: Number
    },
    distance: {
      type: Number
    },
    address: {
      type: String
    },
    types: [
      {
        type: String
      }
    ],
    rating: {
      type: Number
    },
    labels: [
      {
        type: String
      }
    ],
    method: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Useful compound index for analytics
landmarkSearchSchema.index({ user: 1, createdAt: -1 });

const LandmarkSearch = mongoose.model("LandmarkSearch", landmarkSearchSchema);

export default LandmarkSearch;



import mongoose from "mongoose";

const PLACE_STATUS = ["approved", "pending", "rejected"];

const placeSchema = new mongoose.Schema(
  {
    // For Google Places integration (optional but recommended)
    googlePlaceId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      unique: true,
    },

    name: {
      type: String,
      trim: true,
      required: true,
    },

    address: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // Recommendation metadata
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    popularityScore: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },

    // Simple location fields (optional) for easy filtering/sorting
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      index: true,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      index: true,
    },

    // GeoJSON point for geospatial queries
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },

    types: [
      {
        type: String,
        trim: true,
      },
    ],

    media: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        type: { type: String, enum: ["image", "video"], required: true },
      },
    ],

    // Local contribution + moderation
    status: {
      type: String,
      enum: [...PLACE_STATUS, null],
      default: "approved", // backward compatibility: old docs behave as approved
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Keep latitude/longitude and GeoJSON coordinates in sync when possible.
placeSchema.pre("validate", function syncLocation(next) {
  const hasLatLng =
    typeof this.latitude === "number" && typeof this.longitude === "number";

  const coords = this.location?.coordinates;
  const hasCoords =
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number";

  if (hasLatLng) {
    this.location = this.location || { type: "Point", coordinates: [] };
    this.location.type = "Point";
    this.location.coordinates = [this.longitude, this.latitude];
  } else if (hasCoords) {
    // Backfill lat/lng for older records that only have GeoJSON coordinates
    if (typeof this.longitude !== "number") this.longitude = coords[0];
    if (typeof this.latitude !== "number") this.latitude = coords[1];
  }

  next();
});

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ tags: 1 });
placeSchema.index({ popularityScore: -1, rating: -1, createdAt: -1 });
placeSchema.index({ status: 1, createdAt: -1 });
placeSchema.index({ status: 1, tags: 1 });
placeSchema.index({ submittedBy: 1, createdAt: -1 });

const Place = mongoose.model("Place", placeSchema);

export default Place;



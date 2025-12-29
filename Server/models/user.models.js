import mongoose from "mongoose";

const USER_INTERESTS = ["history", "nature", "culture", "food", "adventure"];
const USER_TRAVEL_TIME = ["1_day", "3_days", "7_days"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },

    auth0Id: {
      type: String,
      index: true,
    },

    email: {
      type: String,
      unique: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      enum: ["tourist", "local"],
      default: "tourist",
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    adminRole: {
      type: String,
      enum: ["ceo", "supervisor", "manager", "team_admin", null],
      default: null,
    },

    phone: {
      type: String,
    },

    city: {
      type: String,
    },

    country: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    profilePicture: {
      type: String,
    },

    coverPhoto: {
      type: String,
    },

    otpVerify: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // user IDs to whom this user has sent a friend request
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // user IDs who sent a friend request to this user
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // confirmed friends
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }], // saved posts by the user
    isProfilePrivate: {
      type: Boolean,
      default: false, // false = public, true = private
    },

    // Personalized recommendations (optional; safe defaults for backward compatibility)
    interests: {
      type: [
        {
          type: String,
          enum: USER_INTERESTS,
          trim: true,
          lowercase: true,
        },
      ],
      default: [],
    },
    travelTime: {
      type: String,
      enum: [...USER_TRAVEL_TIME, null],
      default: null,
    },
    visitedPlaces: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
      default: [],
    },
    savedPlaces: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Place" }],
      default: [],
    },
  },

  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;

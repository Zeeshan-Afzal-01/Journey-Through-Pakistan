import mongoose from "mongoose";

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
  },

  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;

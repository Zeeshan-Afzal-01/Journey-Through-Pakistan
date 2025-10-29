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
  },

  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;

import User from "../models/user.models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendOTP from "../utils/sendOTP.js";

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      address,
      phone,
      city,
      postalCode,
      country,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User Already Exists!" });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const file_name = req.file ? `/${req.file.filename}` : "";
    const image_url = req.file ? `uploads/${email}${file_name}` : undefined;
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      shippingAddress: {
        address,
        city,
        postalCode,
        country,
      },
      profilePicture: image_url,
      otpVerify: hashedOTP,
      otpExpiry: Date.now() + 5 * 60 * 1000,
    });
    const saveNewUser = await newUser.save();

    sendOTP(email, otp);

    res.status(200).json({
      message: "User Registered Successfully!",
      user: {
        _id: saveNewUser._id,
        name: saveNewUser.name,
        email: saveNewUser.email,
      },
    });
  } catch (err) {
    console.error(" Register API Error:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  return otp;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please enter email and password!" });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(400).json({ message: "User Doesn't Exists!" });
    }

    const matchPasswords = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!matchPasswords) {
      return res.status(401).json({ message: "Incorrect Password!" });
    }

    const token = jwt.sign({ id: existingUser._id }, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });
    res
      .cookie("appToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: "Login Successful!",
        user: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          profilePic: existingUser.profilePicture,
        },
      });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Login Error", error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find().select("-password");
    res.status(200).json(allUsers);
  } catch (err) {
    res.status(500).json({ message: "Error while getting all users: ", err });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const userExists = await User.findById(userId).select("-password");
    if (!userExists) {
      res.status(400).json({ message: "User Not Found!" });
    }

    res.status(200).json(userExists);
  } catch (err) {
    res.status(500).json({ message: "Error Finding User: ", err });
  }
};

export const updateUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(updates.password, salt);
      updates.password = hashPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password");

    if (!updatedUser) {
      res.status(400).json({ message: "User Not found!" });
    }

    res
      .status(200)
      .json({ message: "User Updated Successfully!", updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Error while updating user: ", err });
  }
};

export const getMe = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("-password");
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json(me);
  } catch (err) {
    res.status(500).json({ message: "Error getting current user", err });
  }
};

export const updateMe = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }
    if (req.file) {
      updates.profilePicture = `uploads/${req.user.email}/${req.file.filename}`;
    }
    const updated = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile", err });
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User Deleted Successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user", err });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otpVerify || !user.otpExpiry)
      return res.status(400).json({ message: "No OTP to verify" });
    if (Date.now() > new Date(user.otpExpiry).getTime())
      return res.status(400).json({ message: "OTP expired" });

    const match = await bcrypt.compare(otp, user.otpVerify);
    if (!match) return res.status(400).json({ message: "Invalid OTP" });

    user.otpVerify = null;
    user.otpExpiry = null;
    await user.save();
    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Error verifying OTP", err });
  }
};

export const logout = (req, res) => {
  try {
    res
      .clearCookie("appToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })
      .status(200)
      .json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout error", err });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    user.otpVerify = hashedOTP;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();
    sendOTP(email, otp);
    res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Error resending OTP", err });
  }
};

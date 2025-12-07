import User from "../models/user.models.js";
import Post from "../models/post.models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendOTP from "../utils/sendOTP.js";
import Notification from "../models/notification.models.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helper function to check if profile picture file exists
const checkProfilePictureExists = (profilePicturePath) => {
  if (!profilePicturePath) return false;
  try {
    const fullPath = path.join(__dirname, "..", profilePicturePath);
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
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
    
    // Check if profile picture file exists
    const hasProfilePicture = checkProfilePictureExists(existingUser.profilePicture);
    
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
          hasProfilePicture: hasProfilePicture,
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

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json([]);
    const regex = new RegExp(q, 'i');
    const users = await User.find({ name: regex }).select("-password").limit(20).lean();
    
    // Add hasProfilePicture to each user
    const usersWithPictureCheck = users.map(user => {
      const hasProfilePicture = checkProfilePictureExists(user.profilePicture);
      return { ...user, hasProfilePicture };
    });
    
    res.json(usersWithPictureCheck);
  } catch (err) {
    res.status(500).json({ message: "Error searching users", err });
  }
};

export const getTopCreators = async (req, res) => {
  try {
    const top = await Post.aggregate([
      { $addFields: { likesCount: { $size: { $ifNull: ["$likes", []] } } } },
      { $group: { _id: "$author", totalLikes: { $sum: "$likesCount" }, posts: { $sum: 1 } } },
      { $sort: { totalLikes: -1, posts: -1 } },
      { $limit: 3 },
    ]);
    const ids = top.map(t => t._id);
    const users = await User.find({ _id: { $in: ids } }).select("name profilePicture").lean();
    
    // Add hasProfilePicture to each user
    const usersWithPictureCheck = users.map(u => {
      const hasProfilePicture = checkProfilePictureExists(u.profilePicture);
      return { ...u, hasProfilePicture };
    });
    
    const idToUser = new Map(usersWithPictureCheck.map(u => [String(u._id), u]));
    const result = top.map(t => ({
      user: idToUser.get(String(t._id)),
      totalLikes: t.totalLikes,
      posts: t.posts,
    })).filter(x => x.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching top creators", err });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const userExists = await User.findById(userId)
      .select("-password")
      .populate("friends", "name profilePicture city")
      .lean();
    if (!userExists) {
      return res.status(404).json({ message: "User Not Found!" });
    }

    // Check if profile picture file exists
    const hasProfilePicture = checkProfilePictureExists(userExists.profilePicture);
    userExists.hasProfilePicture = hasProfilePicture;

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
    
    // Check if profile picture file exists
    const hasProfilePicture = checkProfilePictureExists(me.profilePicture);
    const userResponse = me.toObject ? me.toObject() : me;
    userResponse.hasProfilePicture = hasProfilePicture;
    
    res.json(userResponse);
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
    
    // Handle profile picture upload (single file or from fields)
    if (req.file) {
      updates.profilePicture = `uploads/profiles/${req.file.filename}`;
    }
    if (req.files) {
      if (req.files.profilePicture && req.files.profilePicture[0]) {
        updates.profilePicture = `uploads/profiles/${req.files.profilePicture[0].filename}`;
      }
      if (req.files.coverPhoto && req.files.coverPhoto[0]) {
        updates.coverPhoto = `uploads/covers/${req.files.coverPhoto[0].filename}`;
      }
    }
    
    // Handle text fields
    if (req.body.name) updates.name = req.body.name;
    if (req.body.city) updates.city = req.body.city;
    if (req.body.bio) updates.bio = req.body.bio;
    
    const updated = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password").populate("friends", "name profilePicture city");
    if (!updated) return res.status(404).json({ message: "User not found" });
    
    // Check if profile picture file exists
    const hasProfilePicture = checkProfilePictureExists(updated.profilePicture);
    const userResponse = updated.toObject ? updated.toObject() : updated;
    userResponse.hasProfilePicture = hasProfilePicture;
    
    res.json({ message: "Profile updated", user: userResponse });
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

// FRIEND REQUEST SYSTEM
export const sendFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    if (!userId || !targetUserId) return res.status(400).json({ message: 'User IDs required.' });
    if (userId === targetUserId) return res.status(400).json({ message: 'Cannot send request to self.' });
    const user = await User.findById(userId);
    const target = await User.findById(targetUserId);
    if (!user || !target) return res.status(404).json({ message: 'User(s) not found.' });
    if (user.friends.includes(targetUserId)) return res.status(400).json({ message: 'Already friends.' });
    if (user.sentRequests.includes(targetUserId)) return res.status(400).json({ message: 'Already sent request.' });
    if (user.friendRequests.includes(targetUserId)) return res.status(400).json({ message: 'That user already sent you a request.' });

    user.sentRequests.push(targetUserId);
    target.friendRequests.push(userId);
    await user.save();
    await target.save();

    // Notify recipient about friend request
    await Notification.create({
      recipient: targetUserId,
      actor: userId,
      type: 'friend_request',
      message: 'sent you a friend request'
    });

    return res.json({ message: 'Friend request sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Send request error', err });
  }
};
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestUserId } = req.body;
    if (!userId || !requestUserId) return res.status(400).json({ message: 'User IDs required.' });
    const user = await User.findById(userId);
    const requestUser = await User.findById(requestUserId);
    if (!user || !requestUser) return res.status(404).json({ message: 'User(s) not found.' });
    if (!user.friendRequests.includes(requestUserId)) return res.status(400).json({ message: 'No such friend request.' });

    user.friendRequests = user.friendRequests.filter(u => u.toString() !== requestUserId);
    requestUser.sentRequests = requestUser.sentRequests.filter(u => u.toString() !== userId);
    user.friends.push(requestUserId);
    requestUser.friends.push(userId);
    await user.save();
    await requestUser.save();

    // Notify the requester that their request was accepted
    await Notification.create({
      recipient: requestUserId,
      actor: userId,
      type: 'friend_accept',
      message: 'accepted your friend request'
    });

    return res.json({ message: 'Friend request accepted.' });
  } catch (err) {
    res.status(500).json({ message: 'Accept request error', err });
  }
};
export const declineFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestUserId } = req.body;
    if (!userId || !requestUserId) return res.status(400).json({ message: 'User IDs required.' });
    const user = await User.findById(userId);
    const requestUser = await User.findById(requestUserId);
    if (!user || !requestUser) return res.status(404).json({ message: 'User(s) not found.' });
    if (!user.friendRequests.includes(requestUserId)) return res.status(400).json({ message: 'No such friend request.' });

    user.friendRequests = user.friendRequests.filter(u => u.toString() !== requestUserId);
    requestUser.sentRequests = requestUser.sentRequests.filter(u => u.toString() !== userId);
    await user.save();
    await requestUser.save();
    return res.json({ message: 'Friend request declined.' });
  } catch (err) {
    res.status(500).json({ message: 'Decline request error', err });
  }
};
export const cancelFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    if (!userId || !targetUserId) return res.status(400).json({ message: 'User IDs required.' });
    const user = await User.findById(userId);
    const target = await User.findById(targetUserId);
    if (!user || !target) return res.status(404).json({ message: 'User(s) not found.' });
    if (!user.sentRequests.includes(targetUserId)) return res.status(400).json({ message: 'No such sent request.' });

    user.sentRequests = user.sentRequests.filter(u => u.toString() !== targetUserId);
    target.friendRequests = target.friendRequests.filter(u => u.toString() !== userId);
    await user.save();
    await target.save();
    return res.json({ message: 'Canceled friend request.' });
  } catch (err) {
    res.status(500).json({ message: 'Cancel request error', err });
  }
};
export const unfriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    if (!userId || !targetUserId) return res.status(400).json({ message: 'User IDs required.' });
    const user = await User.findById(userId);
    const friend = await User.findById(targetUserId);
    if (!user || !friend) return res.status(404).json({ message: 'User(s) not found.' });
    if (!user.friends.includes(targetUserId)) return res.status(400).json({ message: 'Not friends.' });
    user.friends = user.friends.filter(u => u.toString() !== targetUserId);
    friend.friends = friend.friends.filter(u => u.toString() !== userId);
    await user.save();
    await friend.save();
    return res.json({ message: 'Unfriended.' });
  } catch (err) {
    res.status(500).json({ message: 'Unfriend error', err });
  }
};

// Get friends list with populated data
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("friends", "name profilePicture city");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Add hasProfilePicture to each friend
    const friendsWithPictureCheck = (user.friends || []).map(friend => {
      const friendObj = friend.toObject ? friend.toObject() : friend;
      friendObj.hasProfilePicture = checkProfilePictureExists(friendObj.profilePicture);
      return friendObj;
    });
    
    res.json(friendsWithPictureCheck);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch friends", error: err.message });
  }
};

// Get user stats (posts count, etc.)
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get posts count
    const postsCount = await Post.countDocuments({ author: userId });
    
    // Get saved posts count
    const user = await User.findById(userId).select('savedPosts').lean();
    const savedPostsCount = user?.savedPosts?.length || 0;
    
    // Get friends count
    const userWithFriends = await User.findById(userId).select('friends').lean();
    const friendsCount = userWithFriends?.friends?.length || 0;
    
    res.json({
      postsCount,
      savedPostsCount,
      friendsCount
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ message: "Failed to fetch user stats", error: err.message });
  }
};

// Get recent activities for current user
export const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get activities from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activities = [];
    
    // 1. Posts created by user
    const userPosts = await Post.find({ 
      author: userId, 
      createdAt: { $gte: thirtyDaysAgo } 
    })
    .select('_id text imageUrl createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    userPosts.forEach(post => {
      const postText = post.text?.substring(0, 50) || 'a post';
      activities.push({
        type: 'post_created',
        description: `Created a new post: "${postText}${post.text?.length > 50 ? '...' : ''}"`,
        timestamp: post.createdAt,
        postId: post._id
      });
    });
    
    // 2. Comments made by user (search in all posts, including nested replies)
    const allPosts = await Post.find({
      $or: [
        { 'comments.author': userId },
        { 'comments.replies.author': userId }
      ]
    })
    .select('_id text comments')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
    
    const extractCommentsRecursively = (comments, postText, postId) => {
      if (!comments || !Array.isArray(comments)) return;
      
      comments.forEach(comment => {
        if (String(comment.author) === String(userId) && 
            comment.createdAt && 
            new Date(comment.createdAt) >= thirtyDaysAgo) {
          const commentText = comment.text?.substring(0, 40) || 'a comment';
          const truncatedPostText = postText?.substring(0, 30) || 'a post';
          activities.push({
            type: 'comment',
            description: `Commented "${commentText}${comment.text?.length > 40 ? '...' : ''}" on "${truncatedPostText}${postText?.length > 30 ? '...' : ''}"`,
            timestamp: comment.createdAt,
            postId: postId
          });
        }
        
        // Recursively check replies
        if (comment.replies && Array.isArray(comment.replies)) {
          extractCommentsRecursively(comment.replies, postText, postId);
        }
      });
    };
    
    allPosts.forEach(post => {
      const postText = post.text || '';
      extractCommentsRecursively(post.comments, postText, post._id);
    });
    
    // 3. Likes given by user
    const likedPosts = await Post.find({
      likes: userId,
      updatedAt: { $gte: thirtyDaysAgo }
    })
    .select('_id text author')
    .populate('author', 'name')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();
    
    likedPosts.forEach(post => {
      const postText = post.text?.substring(0, 40) || 'a post';
      const authorName = post.author?.name || 'someone';
      activities.push({
        type: 'like',
        description: `Liked "${postText}${post.text?.length > 40 ? '...' : ''}" by ${authorName}`,
        timestamp: post.updatedAt,
        postId: post._id
      });
    });
    
    // 4. Statuses created by user
    const Status = (await import('../models/status.models.js')).default;
    const userStatuses = await Status.find({
      author: userId,
      createdAt: { $gte: thirtyDaysAgo }
    })
    .select('_id caption createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    userStatuses.forEach(status => {
      activities.push({
        type: 'status',
        description: `Created a new status${status.caption ? `: "${status.caption.substring(0, 30)}${status.caption.length > 30 ? '...' : ''}"` : ''}`,
        timestamp: status.createdAt,
        statusId: status._id
      });
    });
    
    // 5. Saved posts
    const user = await User.findById(userId).select('savedPosts').lean();
    if (user?.savedPosts && user.savedPosts.length > 0) {
      const savedPosts = await Post.find({
        _id: { $in: user.savedPosts },
        updatedAt: { $gte: thirtyDaysAgo }
      })
      .select('_id text author')
      .populate('author', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
      
      savedPosts.forEach(post => {
        const postText = post.text?.substring(0, 40) || 'a post';
        activities.push({
          type: 'saved',
          description: `Saved "${postText}${post.text?.length > 40 ? '...' : ''}"`,
          timestamp: post.updatedAt,
          postId: post._id
        });
      });
    }
    
    // 6. Groups joined
    const Group = (await import('../models/group.models.js')).default;
    const joinedGroups = await Group.find({
      members: userId,
      updatedAt: { $gte: thirtyDaysAgo }
    })
    .select('_id name updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();
    
    joinedGroups.forEach(group => {
      activities.push({
        type: 'group_joined',
        description: `Joined group "${group.name}"`,
        timestamp: group.updatedAt,
        groupId: group._id
      });
    });
    
    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Return top 7 most recent activities
    res.json(activities.slice(0, 6));
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({ message: "Failed to fetch recent activities", error: err.message });
  }
};

// Get community participation (posts, comments, shares) by time period (for dashboard graph)
export const getCommunityAttractionsByMonth = async (req, res) => {
  try {
    const { period = '12months' } = req.query; // period: '7days', '30days', '12months', 'year'
    
    let startDate = new Date();
    let groupBy = {};
    
    // Determine date range and grouping based on period
    let isDayGrouping = false;
    if (period === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      isDayGrouping = true;
      groupBy = { 
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      };
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 30);
      isDayGrouping = true;
      groupBy = { 
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      };
    } else if (period === '12months' || period === 'year') {
      startDate.setMonth(startDate.getMonth() - 12);
      isDayGrouping = false;
      groupBy = { 
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      };
    } else {
      startDate.setMonth(startDate.getMonth() - 12);
      isDayGrouping = false;
      groupBy = { 
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      };
    }
    
    // Format data for the chart
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Aggregate posts by date
    const postsData = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          posts: { $sum: 1 },
          shares: { $sum: "$shares" }
        }
      }
    ]);

    // 2. Aggregate comments by date (including nested replies)
    // Fetch all posts and manually count comments and replies
    const allPosts = await Post.find({
      createdAt: { $gte: startDate }
    }).select('comments createdAt').lean();

    const commentsByDate = {};
    
    // Helper function to recursively count comments
    const countComments = (comments) => {
      if (!comments || !Array.isArray(comments)) return;
      comments.forEach(comment => {
        if (comment.createdAt) {
          const commentDate = new Date(comment.createdAt);
          const key = period === '7days' || period === '30days'
            ? `${commentDate.getDate()}/${commentDate.getMonth() + 1}/${commentDate.getFullYear()}`
            : `${monthNames[commentDate.getMonth()]} ${commentDate.getFullYear()}`;
          if (!commentsByDate[key]) commentsByDate[key] = 0;
          commentsByDate[key]++;
        }
        // Recursively count replies
        if (comment.replies && Array.isArray(comment.replies)) {
          countComments(comment.replies);
        }
      });
    };

    allPosts.forEach(post => {
      if (post.comments && post.comments.length > 0) {
        countComments(post.comments);
      }
    });

    // Convert to format matching postsData
    const commentsData = Object.entries(commentsByDate).map(([key, count]) => {
      // Parse key to get date components
      let _id;
      if (period === '7days' || period === '30days') {
        const [day, month, year] = key.split('/').map(Number);
        _id = { day, month, year };
      } else {
        const [monthName, year] = key.split(' ');
        const month = monthNames.indexOf(monthName) + 1;
        _id = { month, year: parseInt(year) };
      }
      return { _id, comments: count };
    });
    
    // Combine posts, comments, and shares data
    const combinedData = {};
    
    postsData.forEach(item => {
      const day = item._id.day;
      const month = item._id.month;
      const year = item._id.year;
      const key = isDayGrouping
        ? `${day}/${month}/${year}`
        : `${monthNames[month - 1]} ${year}`;
      if (!combinedData[key]) {
        combinedData[key] = {
          _id: item._id,
          posts: 0,
          comments: 0,
          shares: 0,
          total: 0
        };
      }
      combinedData[key].posts = item.posts;
      combinedData[key].shares = item.shares || 0;
      combinedData[key].total = combinedData[key].posts + combinedData[key].comments + combinedData[key].shares;
    });

    commentsData.forEach(item => {
      const day = item._id.day;
      const month = item._id.month;
      const year = item._id.year;
      const key = isDayGrouping
        ? `${day}/${month}/${year}`
        : `${monthNames[month - 1]} ${year}`;
      if (!combinedData[key]) {
        combinedData[key] = {
          _id: item._id,
          posts: 0,
          comments: 0,
          shares: 0,
          total: 0
        };
      }
      combinedData[key].comments = item.comments;
      combinedData[key].total = combinedData[key].posts + combinedData[key].comments + combinedData[key].shares;
    });

    let result = [];
    
    if (period === '7days' || period === '30days') {
      // Fill in missing days with 0
      const now = new Date();
      const daysBack = period === '7days' ? 7 : 30;
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const existing = combinedData[dateKey];
        result.push({
          label: dateKey,
          month: `${monthNames[date.getMonth()]} ${date.getDate()}`,
          posts: existing?.posts || 0,
          comments: existing?.comments || 0,
          shares: existing?.shares || 0,
          total: existing?.total || 0,
          date: date,
          day: date.getDate(),
          monthNum: date.getMonth() + 1,
          year: date.getFullYear()
        });
      }
    } else {
      // Fill in missing months with 0
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        const existing = combinedData[monthKey];
        result.push({
          label: monthKey,
          month: monthKey,
          posts: existing?.posts || 0,
          comments: existing?.comments || 0,
          shares: existing?.shares || 0,
          total: existing?.total || 0,
          year: date.getFullYear(),
          monthNum: date.getMonth() + 1
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching community participation:', err);
    res.status(500).json({ message: "Failed to fetch community participation", error: err.message });
  }
};
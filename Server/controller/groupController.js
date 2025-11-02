import Group from "../models/group.models.js";
import Post from "../models/post.models.js";
import User from "../models/user.models.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, privacy, category, location, coverImage, tags } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      admin: userId,
      members: [userId], // Admin is automatically a member
      privacy: privacy || "public",
      category: category || "",
      location: location || "",
      coverImage: coverImage || "",
      tags: tags || [],
    });

    await group.save();
    
    // Populate admin and members
    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to create group", error: err.message });
  }
};

// Get all groups (public groups or groups user is member of, or private groups for joining)
export const listGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, category } = req.query;

    // Show: public groups, groups user is member of, OR private groups (so users can request to join)
    let query = {
      $or: [
        { privacy: "public" },
        { members: userId },
        { privacy: "private" }, // Show private groups so users can request to join
      ],
    };

    if (search) {
      query.$and = [
        {
          name: { $regex: search, $options: "i" }
        },
      ];
    }

    if (category) {
      query.category = category;
    }

    const groups = await Group.find(query)
      .populate("admin", "name profilePicture")
      .populate("members", "name profilePicture")
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch groups", error: err.message });
  }
};

// Get a single group by ID
export const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id)
      .populate("admin", "name profilePicture")
      .populate("members", "name profilePicture");
    
    if (group && group.pendingRequests && group.pendingRequests.length > 0) {
      await group.populate("pendingRequests", "name profilePicture");
    }

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user can view this group (for private groups)
    // After populate, members are objects, so check _id property
    if (group.privacy === "private") {
      const isAdmin = group.admin._id.toString() === userId;
      const isMember = isAdmin || group.members.some(m => {
        const memberId = m._id ? m._id.toString() : m.toString();
        return memberId === userId;
      });
      
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this private group" });
      }
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch group", error: err.message });
  }
};

// Update group (only admin can update)
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description, privacy, category, location, coverImage, tags, rules } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can update the group" });
    }

    if (name !== undefined) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim() || "";
    if (privacy !== undefined) group.privacy = privacy;
    if (category !== undefined) group.category = category || "";
    if (location !== undefined) group.location = location || "";
    if (coverImage !== undefined) group.coverImage = coverImage || "";
    if (tags !== undefined) group.tags = tags || [];
    if (rules !== undefined) group.rules = rules || [];

    await group.save();
    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to update group", error: err.message });
  }
};

// Delete group (only admin can delete)
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can delete the group" });
    }

    // Delete all posts in this group
    await Post.deleteMany({ group: id });

    await Group.findByIdAndDelete(id);
    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete group", error: err.message });
  }
};

// Join a group
export const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "You are already a member of this group" });
    }

    if (group.pendingRequests && group.pendingRequests.includes(userId)) {
      return res.status(400).json({ message: "You have already requested to join this group" });
    }

    // For public groups, join immediately
    // For private groups, add to pending requests
    if (group.privacy === "public") {
      group.members.push(userId);
    } else {
      group.pendingRequests = group.pendingRequests || [];
      group.pendingRequests.push(userId);
    }
    await group.save();

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    if (group.pendingRequests && group.pendingRequests.length > 0) {
      await group.populate("pendingRequests", "name profilePicture");
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to join group", error: err.message });
  }
};

// Leave a group
export const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() === userId) {
      return res.status(400).json({ message: "Admin cannot leave the group. Transfer admin rights or delete the group instead." });
    }

    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    group.members = group.members.filter(memberId => memberId.toString() !== userId);
    await group.save();

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to leave group", error: err.message });
  }
};

// Get groups user is member of
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.find({ members: userId })
      .populate("admin", "name profilePicture")
      .populate("members", "name profilePicture")
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your groups", error: err.message });
  }
};

// Get posts in a group
export const getGroupPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user can view posts in this group
    if (group.privacy === "private" && !group.members.includes(userId) && group.admin._id.toString() !== userId) {
      return res.status(403).json({ message: "You don't have access to this group's posts" });
    }

    const posts = await Post.find({ group: id })
      .populate("author", "name profilePicture city")
      .populate({
        path: "comments.author",
        select: "name profilePicture city",
      })
      .populate({
        path: "comments.replies.author",
        select: "name profilePicture city",
      })
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch group posts", error: err.message });
  }
};

// Update group cover image
export const updateGroupCover = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can update cover image" });
    }

    if (req.file) {
      group.coverImage = `uploads/groups/${req.file.filename}`;
      await group.save();
    }

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to update cover image", error: err.message });
  }
};

// Update group photo (avatar)
export const updateGroupPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can update group photo" });
    }

    if (req.file) {
      group.groupPhoto = `uploads/groups/${req.file.filename}`;
      await group.save();
    }

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to update group photo", error: err.message });
  }
};

// Add member to group (admin only, invite friends)
export const addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    if (group.members.includes(memberId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    group.members.push(memberId);
    // Remove from pending requests if exists
    if (group.pendingRequests && group.pendingRequests.includes(memberId)) {
      group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== memberId);
    }
    await group.save();

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    if (group.pendingRequests && group.pendingRequests.length > 0) {
      await group.populate("pendingRequests", "name profilePicture");
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to add member", error: err.message });
  }
};

// Remove member from group (admin only)
export const removeMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    if (memberId === userId) {
      return res.status(400).json({ message: "Admin cannot remove themselves" });
    }

    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    if (group.pendingRequests && group.pendingRequests.length > 0) {
      await group.populate("pendingRequests", "name profilePicture");
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to remove member", error: err.message });
  }
};

// Approve join request (admin only, for private groups)
export const approveJoinRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: requestUserId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can approve requests" });
    }

    if (!group.pendingRequests || !group.pendingRequests.includes(requestUserId)) {
      return res.status(400).json({ message: "No pending request found for this user" });
    }

    if (group.members.includes(requestUserId)) {
      group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== requestUserId);
      await group.save();
      await group.populate("admin", "name profilePicture");
      await group.populate("members", "name profilePicture");
      return res.json(group);
    }

    group.members.push(requestUserId);
    group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== requestUserId);
    await group.save();

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    if (group.pendingRequests && group.pendingRequests.length > 0) {
      await group.populate("pendingRequests", "name profilePicture");
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to approve request", error: err.message });
  }
};

// Decline join request (admin only, for private groups)
export const declineJoinRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: requestUserId } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: "Only admin can decline requests" });
    }

    group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== requestUserId);
    await group.save();

    await group.populate("admin", "name profilePicture");
    await group.populate("members", "name profilePicture");
    if (group.pendingRequests && group.pendingRequests.length > 0) {
      await group.populate("pendingRequests", "name profilePicture");
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to decline request", error: err.message });
  }
};


import Post from "../models/post.models.js";
import Notification from "../models/notification.models.js";
import User from "../models/user.models.js";
import Hashtag from "../models/hashtag.models.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function extractHashtags(text) {
  if (!text) return [];
  return [...text.matchAll(/#(\w{2,})/g)].map(x => x[1].toLowerCase());
}

export const createPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, imageUrl, place, feeling, privacy, group, taggedUsers } = req.body;
 
   

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    // Accept either text or an image (like Facebook). Require at least one.

    let finalImageUrl = imageUrl;
    if (req.file) {
      finalImageUrl = `uploads/posts/${req.file.filename}`;
    }

    if ((!text || text.trim().length === 0) && !finalImageUrl) {
      return res.status(400).json({ message: "Post must include text or an image" });
    }

    // If posting to a group, verify user is a member
    if (group) {
      const Group = (await import("../models/group.models.js")).default;
      const groupDoc = await Group.findById(group);
      if (!groupDoc) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!groupDoc.members.includes(userId) && groupDoc.admin.toString() !== userId) {
        return res.status(403).json({ message: "You must be a member of the group to post" });
      }
    }

    // Validate tagged users - they must be friends
    let validTaggedUsers = [];
    if (taggedUsers && Array.isArray(taggedUsers) && taggedUsers.length > 0) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const friendIds = user.friends.map(f => f.toString());
      validTaggedUsers = taggedUsers.filter(taggedId => {
        const taggedStr = typeof taggedId === 'string' ? taggedId : taggedId.toString();
        return friendIds.includes(taggedStr);
      });
    }

    // --- Hashtag extraction logic ---
    const hashtags = extractHashtags(text || "");


    const post = await Post.create({ 
      author: userId, 
      text, 
      imageUrl: finalImageUrl, 
      place, 
      feeling, 
      privacy, 
      group: group || null, 
      hashtags,
      taggedUsers: validTaggedUsers.length > 0 ? validTaggedUsers : undefined
    });
    
    // Send notifications to tagged users
    if (validTaggedUsers.length > 0) {
      for (const taggedUserId of validTaggedUsers) {
        await Notification.create({
          recipient: taggedUserId,
          actor: userId,
          type: "tag",
          post: post._id,
          message: "tagged you in a post"
        });
      }
    }
    
    // Update/increment hashtags collection for each tag
    for (const tag of hashtags) {
      await Hashtag.findOneAndUpdate(
        { tag },
        { $inc: { count: 1 }, $set: { lastUsed: new Date() } },
        { upsert: true }
      );
    }
    const populated = await Post.findById(post._id)
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate("taggedUsers", "name profilePicture")
      .lean();
    
    // Add hasProfilePicture to author
    if (populated && populated.author) {
      populated.author.hasProfilePicture = checkProfilePictureExists(populated.author.profilePicture);
    }
    
    // Add hasProfilePicture to taggedUsers
    if (populated && populated.taggedUsers && Array.isArray(populated.taggedUsers)) {
      populated.taggedUsers = populated.taggedUsers.map(user => {
        user.hasProfilePicture = checkProfilePictureExists(user.profilePicture);
        return user;
      });
    }
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to create post", error: err.message });
  }
};

export const listPosts = async (req, res) => {
  try {
    const { author, q, group, excludeGroup } = req.query;
    const filter = {};
    if (author) filter.author = author;
    if (group) filter.group = group;
    if (excludeGroup === 'true') filter.group = { $exists: false }; // Only non-group posts
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { text: regex },
        { place: regex },
        { feeling: regex },
      ];
    }
    let posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate("taggedUsers", "name profilePicture")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" });
    // Convert and recursively populate deeper replies
    const out = [];
    for (let p of posts) {
      const obj = p.toObject();
      
      // Add hasProfilePicture to author
      if (obj.author) {
        obj.author.hasProfilePicture = checkProfilePictureExists(obj.author.profilePicture);
      }
      
      // Add hasProfilePicture to tagged users
      if (obj.taggedUsers && Array.isArray(obj.taggedUsers)) {
        obj.taggedUsers = obj.taggedUsers.map(taggedUser => ({
          ...taggedUser,
          hasProfilePicture: checkProfilePictureExists(taggedUser.profilePicture)
        }));
      }
      
      await populateRepliesAuthors(obj.comments);
      
      // Add hasProfilePicture to comment authors and reply authors
      if (obj.comments && Array.isArray(obj.comments)) {
        const addHasProfilePictureToComments = (comments) => {
          if (!comments || !Array.isArray(comments)) return;
          comments.forEach(comment => {
            if (comment.author) {
              comment.author.hasProfilePicture = checkProfilePictureExists(comment.author.profilePicture);
            }
            if (comment.replies && Array.isArray(comment.replies)) {
              addHasProfilePictureToComments(comment.replies);
            }
          });
        };
        addHasProfilePictureToComments(obj.comments);
      }
      
      out.push(obj);
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts", error: err.message });
  }
};

export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the post without populating taggedUsers to check if it exists
    let post = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" });
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    post = post.toObject();
    
    // Safely populate taggedUsers
    if (post.taggedUsers && Array.isArray(post.taggedUsers) && post.taggedUsers.length > 0) {
      try {
        const taggedUserIds = post.taggedUsers.map(id => {
          // Handle both ObjectId and string formats
          if (!id) return null;
          if (mongoose.Types.ObjectId.isValid(id)) {
            if (id._id) return new mongoose.Types.ObjectId(id._id);
            if (typeof id === 'object' && id.toString) return new mongoose.Types.ObjectId(id);
            if (typeof id === 'string') return new mongoose.Types.ObjectId(id);
            return new mongoose.Types.ObjectId(id);
          }
          return null;
        }).filter(id => id !== null && mongoose.Types.ObjectId.isValid(id)); // Remove any null/undefined/invalid values
        
        if (taggedUserIds.length > 0) {
          const taggedUsers = await User.find({ _id: { $in: taggedUserIds } })
            .select("name profilePicture")
            .lean();
          post.taggedUsers = taggedUsers || [];
        } else {
          post.taggedUsers = [];
        }
      } catch (populateErr) {
        console.error('Error populating taggedUsers:', populateErr);
        post.taggedUsers = []; // Set to empty array if populate fails
      }
    } else {
      post.taggedUsers = post.taggedUsers || [];
    }
    
    // Populate nested replies
    if (post.comments && post.comments.length > 0) {
      await populateRepliesAuthors(post.comments);
    }
    
    // Add hasProfilePicture to author
    if (post.author) {
      post.author.hasProfilePicture = checkProfilePictureExists(post.author.profilePicture);
    }
    
    // Add hasProfilePicture to taggedUsers
    if (post.taggedUsers && Array.isArray(post.taggedUsers)) {
      post.taggedUsers = post.taggedUsers.map(user => {
        user.hasProfilePicture = checkProfilePictureExists(user.profilePicture);
        return user;
      });
    }
    
    // Add hasProfilePicture to comment authors
    if (post.comments && Array.isArray(post.comments)) {
      post.comments = post.comments.map(comment => {
        if (comment.author) {
          comment.author.hasProfilePicture = checkProfilePictureExists(comment.author.profilePicture);
        }
        if (comment.replies && Array.isArray(comment.replies)) {
          comment.replies = comment.replies.map(reply => {
            if (reply.author) {
              reply.author.hasProfilePicture = checkProfilePictureExists(reply.author.profilePicture);
            }
            return reply;
          });
        }
        return comment;
      });
    }
    
    res.json(post);
  } catch (err) {
    console.error('Error in getPost:', err);
    res.status(500).json({ message: "Failed to fetch post", error: err.message });
  }
};

export const toggleSavePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const isSaved = user.savedPosts && user.savedPosts.some(p => p.toString() === id);
    
    if (isSaved) {
      // Unsave post
      user.savedPosts = user.savedPosts.filter(p => p.toString() !== id);
      await user.save();
      res.json({ saved: false, message: "Post unsaved" });
    } else {
      // Save post
      user.savedPosts = user.savedPosts || [];
      user.savedPosts.push(id);
      await user.save();
      res.json({ saved: true, message: "Post saved" });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle save", error: err.message });
  }
};

export const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const savedPostIds = user.savedPosts || [];
    if (savedPostIds.length === 0) {
      return res.json([]);
    }
    
    // Fetch posts with populated author and group
    const savedPosts = await Post.find({ _id: { $in: savedPostIds } })
      .populate("author", "name profilePicture city")
      .populate("group", "name groupPhoto")
      .populate("taggedUsers", "name profilePicture")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" })
      .sort({ createdAt: -1 });
    
    // Convert to objects and populate deeper nested replies
    const out = [];
    for (const post of savedPosts) {
      if (!post) continue; // Skip null/deleted posts
      const obj = post.toObject ? post.toObject() : post;
      if (obj.comments && obj.comments.length > 0) {
        await populateRepliesAuthors(obj.comments);
      }
      out.push(obj);
    }
    
    res.json(out);
  } catch (err) {
    console.error('Error in getSavedPosts:', err);
    res.status(500).json({ message: "Failed to fetch saved posts", error: err.message });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const hasLiked = post.likes.some((u) => u.toString() === userId);
    if (hasLiked) {
      post.likes = post.likes.filter((u) => u.toString() !== userId);
    } else {
      post.likes.push(userId);
      if (post.author.toString() !== userId) {
        await Notification.create({
          recipient: post.author,
          actor: userId,
          type: "like",
          post: post._id,
          message: "liked your post",
        });
      }
    }
    await post.save();
    let populated = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate("taggedUsers", "name profilePicture")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" });
    populated = populated ? populated.toObject() : null;
    if (populated) {
      await populateRepliesAuthors(populated.comments);
      
      // Add hasProfilePicture to author
      if (populated.author) {
        populated.author.hasProfilePicture = checkProfilePictureExists(populated.author.profilePicture);
      }
      
      // Add hasProfilePicture to taggedUsers
      if (populated.taggedUsers && Array.isArray(populated.taggedUsers)) {
        populated.taggedUsers = populated.taggedUsers.map(user => {
          user.hasProfilePicture = checkProfilePictureExists(user.profilePicture);
          return user;
        });
      }
      
      // Add hasProfilePicture to comment authors
      if (populated.comments && Array.isArray(populated.comments)) {
        const addHasProfilePictureToComments = (comments) => {
          if (!comments || !Array.isArray(comments)) return;
          comments.forEach(comment => {
            if (comment.author) {
              comment.author.hasProfilePicture = checkProfilePictureExists(comment.author.profilePicture);
            }
            if (comment.replies && Array.isArray(comment.replies)) {
              addHasProfilePictureToComments(comment.replies);
            }
          });
        };
        addHasProfilePictureToComments(populated.comments);
      }
    }
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to like post", error: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Comment text is required" });
    }
    const post = await Post.findById(id).populate("author");
    if (!post) return res.status(404).json({ message: "Post not found" });
    // Comment privacy enforcement
    if (post.privacy === 'friends') {
      // Only author or friends can comment
      if ((post.author._id.toString() !== userId) &&
        !(post.author.friends && post.author.friends.map(x=>x.toString()).includes(userId))) {
        return res.status(403).json({ message: 'Only friends can comment on this post.' });
      }
    }
    // end privacy guard
    const newComment = { author: userId, text };
    if (parentCommentId) {
      function addReply(comments) {
        for (let comm of comments) {
          if (comm._id.toString() === parentCommentId) {
            comm.replies = comm.replies || [];
            comm.replies.push(newComment);
            return true;
          }
          if (comm.replies && comm.replies.length > 0) {
            if (addReply(comm.replies)) return true;
          }
        }
        return false;
      }
      if (!addReply(post.comments)) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      post.markModified("comments");
    } else {
      post.comments.push(newComment);
      post.markModified("comments");
    }
    await post.save();
    if (post.author._id.toString() !== userId) {
      await Notification.create({
        recipient: post.author._id,
        actor: userId,
        type: "comment",
        post: post._id,
        message: "commented on your post",
      });
    }
    let populated = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate("taggedUsers", "name profilePicture")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" });
    populated = populated ? populated.toObject() : null;
    if (populated) {
      await populateRepliesAuthors(populated.comments);
      
      // Add hasProfilePicture to author
      if (populated.author) {
        populated.author.hasProfilePicture = checkProfilePictureExists(populated.author.profilePicture);
      }
      
      // Add hasProfilePicture to taggedUsers
      if (populated.taggedUsers && Array.isArray(populated.taggedUsers)) {
        populated.taggedUsers = populated.taggedUsers.map(user => {
          user.hasProfilePicture = checkProfilePictureExists(user.profilePicture);
          return user;
        });
      }
      
      // Add hasProfilePicture to comment authors
      if (populated.comments && Array.isArray(populated.comments)) {
        const addHasProfilePictureToComments = (comments) => {
          if (!comments || !Array.isArray(comments)) return;
          comments.forEach(comment => {
            if (comment.author) {
              comment.author.hasProfilePicture = checkProfilePictureExists(comment.author.profilePicture);
            }
            if (comment.replies && Array.isArray(comment.replies)) {
              addHasProfilePictureToComments(comment.replies);
            }
          });
        };
        addHasProfilePictureToComments(populated.comments);
      }
    }
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to add comment", error: err.message });
  }
};

export const sharePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.shares += 1;
    await post.save();

    if (post.author.toString() !== userId) {
      await Notification.create({
        recipient: post.author,
        actor: userId,
        type: "share",
        post: post._id,
        message: "shared your post",
      });
    }

    const populated = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" })
      .lean();
    
    if (!populated) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Populate nested replies
    if (populated.comments && populated.comments.length > 0) {
      await populateRepliesAuthors(populated.comments);
    }
    
    // Add hasProfilePicture to author
    if (populated.author) {
      populated.author.hasProfilePicture = checkProfilePictureExists(populated.author.profilePicture);
    }
    
    // Add hasProfilePicture to taggedUsers if they exist
    if (populated.taggedUsers && Array.isArray(populated.taggedUsers)) {
      populated.taggedUsers = populated.taggedUsers.map(user => {
        if (user && typeof user === 'object') {
          user.hasProfilePicture = checkProfilePictureExists(user.profilePicture);
        }
        return user;
      });
    }
    
    // Add hasProfilePicture to comment authors
    if (populated.comments && Array.isArray(populated.comments)) {
      const addHasProfilePictureToComments = (comments) => {
        if (!comments || !Array.isArray(comments)) return;
        comments.forEach(comment => {
          if (comment.author) {
            comment.author.hasProfilePicture = checkProfilePictureExists(comment.author.profilePicture);
          }
          if (comment.replies && Array.isArray(comment.replies)) {
            addHasProfilePictureToComments(comment.replies);
          }
        });
      };
      addHasProfilePictureToComments(populated.comments);
    }
    
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to share post", error: err.message });
  }
};

// Update post (only author can update)
export const updatePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { text, place, feeling, privacy } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: "Only the author can update this post" });
    }

    // Update fields
    if (text !== undefined) {
      post.text = text;
      // Re-extract hashtags if text changed
      const hashtags = extractHashtags(text || "");
      post.hashtags = hashtags;
      // Update hashtag counts
      for (const tag of hashtags) {
        await Hashtag.findOneAndUpdate(
          { tag },
          { $inc: { count: 1 }, $set: { lastUsed: new Date() } },
          { upsert: true }
        );
      }
    }
    if (place !== undefined) post.place = place;
    if (feeling !== undefined) post.feeling = feeling;
    if (privacy !== undefined) post.privacy = privacy;

    await post.save();

    // Populate and return updated post
    let populated = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("group", "name")
      .populate("taggedUsers", "name profilePicture")
      .populate({ path: "comments.author", select: "name profilePicture city" })
      .populate({ path: "comments.replies.author", select: "name profilePicture city" });
    
    populated = populated ? populated.toObject() : null;
    if (populated) {
      await populateRepliesAuthors(populated.comments);
      
      // Add hasProfilePicture to author
      if (populated.author) {
        populated.author.hasProfilePicture = checkProfilePictureExists(populated.author.profilePicture);
      }
      
      // Add hasProfilePicture to taggedUsers
      if (populated.taggedUsers && Array.isArray(populated.taggedUsers)) {
        populated.taggedUsers = populated.taggedUsers.map(user => {
          user.hasProfilePicture = checkProfilePictureExists(user.profilePicture);
          return user;
        });
      }
      
      // Add hasProfilePicture to comment authors
      if (populated.comments && Array.isArray(populated.comments)) {
        const addHasProfilePictureToComments = (comments) => {
          if (!comments || !Array.isArray(comments)) return;
          comments.forEach(comment => {
            if (comment.author) {
              comment.author.hasProfilePicture = checkProfilePictureExists(comment.author.profilePicture);
            }
            if (comment.replies && Array.isArray(comment.replies)) {
              addHasProfilePictureToComments(comment.replies);
            }
          });
        };
        addHasProfilePictureToComments(populated.comments);
      }
    }

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update post", error: err.message });
  }
};

// Delete post (only author can delete)
export const deletePost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: "Only the author can delete this post" });
    }

    // Decrease hashtag counts
    if (post.hashtags && post.hashtags.length > 0) {
      for (const tag of post.hashtags) {
        await Hashtag.findOneAndUpdate(
          { tag },
          { $inc: { count: -1 } }
        );
      }
    }

    // Delete all notifications related to this post
    await Notification.deleteMany({ post: id });

    await Post.findByIdAndDelete(id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete post", error: err.message });
  }
};

export const trendingHashtags = async (req, res) => {
  try {
    let tags = await Hashtag.find({})
      .sort({ count: -1, lastUsed: -1 })
      .limit(4)
      .lean();

    // Optionally filter out extremely generic tags by hand:
    const stopwords = ["hello","test","general"];
    tags = tags.filter(t => !stopwords.includes(t.tag));
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trending hashtags", error: err.message });
  }
};

// Helper: recursively populate author for all replies (mongooose doesn't do >2 levels)
async function populateRepliesAuthors(comments) {
  for (const c of comments) {
    if (c.replies && c.replies.length > 0) {
      for (const r of c.replies) {
        if (r.author && typeof r.author === 'string') {
          // ID only, populate
          const user = await User.findById(r.author).select('name profilePicture city');
          if (user) r.author = user;
        } else if (r.author && r.author?._id && !r.author?.name) {
          const user = await User.findById(r.author._id).select('name profilePicture city');
          if (user) r.author = user;
        }
      }
      await populateRepliesAuthors(c.replies); // recurse
    }
  }
}



import Post from "../models/post.models.js";
import Notification from "../models/notification.models.js";

export const createPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { text, imageUrl, place, feeling } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    // Accept either text or an image (like Facebook). Require at least one.

    let finalImageUrl = imageUrl;
    if (req.file) {
      finalImageUrl = `uploads/posts/${req.file.filename}`;
    }

    if ((!text || text.trim().length === 0) && !finalImageUrl) {
      return res.status(400).json({ message: "Post must include text or an image" });
    }

    const post = await Post.create({ author: userId, text, imageUrl: finalImageUrl, place, feeling });
    const populated = await post.populate("author", "name profilePicture city");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to create post", error: err.message });
  }
};

export const listPosts = async (req, res) => {
  try {
    const { author, q } = req.query;
    const filter = {};
    if (author) filter.author = author;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { text: regex },
        { place: regex },
        { feeling: regex },
      ];
    }
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("author", "name profilePicture city")
      .lean();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts", error: err.message });
  }
};

export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("comments.author", "name profilePicture city");
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch post", error: err.message });
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
    const populated = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to like post", error: err.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { text } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ author: userId, text });
    await post.save();

    if (post.author.toString() !== userId) {
      await Notification.create({
        recipient: post.author,
        actor: userId,
        type: "comment",
        post: post._id,
        message: "commented on your post",
      });
    }

    const populated = await Post.findById(id)
      .populate("author", "name profilePicture city")
      .populate("comments.author", "name profilePicture city");
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
      .lean();
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to share post", error: err.message });
  }
};



import mongoose from "mongoose";

let commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    // Will add replies after definition for recursion!
  },
  { timestamps: true }
);
commentSchema.add({ replies: [commentSchema] });

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    imageUrl: { type: String },
    place: { type: String },
    feeling: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    shares: { type: Number, default: 0 },
    privacy: { type: String, enum: ["public", "friends"], default: "public" },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // Optional: if post belongs to a group
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users tagged in this post
    hashtags: [{ type: String }], // Hashtags extracted from post text

  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;



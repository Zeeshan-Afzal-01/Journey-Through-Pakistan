import mongoose from "mongoose";
const hashtagSchema = new mongoose.Schema({
  tag: { type: String, unique: true, required: true, index: true },
  count: { type: Number, default: 1 },
  lastUsed: { type: Date, default: Date.now }
});
const Hashtag = mongoose.model("Hashtag", hashtagSchema);
export default Hashtag;

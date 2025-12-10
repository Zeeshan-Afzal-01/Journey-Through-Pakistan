import mongoose from "mongoose";

const backupSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    size: { type: Number, required: true }, // Size in bytes
    type: { type: String, enum: ["manual", "scheduled", "automatic"], default: "manual" },
    status: { type: String, enum: ["completed", "failed", "in_progress"], default: "completed" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    description: { type: String },
    collections: [{ type: String }], // Which collections were backed up
  },
  { timestamps: true }
);

const Backup = mongoose.model("Backup", backupSchema);

export default Backup;


import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    datasetId: { type: mongoose.Schema.Types.ObjectId, ref: "Dataset", required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    pipeline: { type: mongoose.Schema.Types.Mixed, default: null },
    resultPreview: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

chatMessageSchema.index({ datasetId: 1, createdAt: 1 });
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
import mongoose from "mongoose";

const columnSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["string", "number", "date", "boolean"], required: true },
    sampleValues: [mongoose.Schema.Types.Mixed],
  },
  { _id: false }
);

const datasetSchema = new mongoose.Schema(
  {
    originalFileName: { type: String, required: true },
    collectionName: { type: String, required: true, unique: true }, // Mongo collection holding the rows
    rowCount: { type: Number, required: true },
    columns: [columnSchema],
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Dataset = mongoose.model("Dataset", datasetSchema);
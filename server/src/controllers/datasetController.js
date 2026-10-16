import mongoose from "mongoose";
import fs from "fs";
import { Dataset } from "../models/Dataset.js";
import { parseFile, inferSchema, castRows } from "../utils/fileParser.js";

export async function uploadDataset(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const filePath = req.file.path;

  try {
    const rawRows = await parseFile(filePath);
    if (rawRows.length === 0) {
      return res.status(400).json({ error: "The uploaded file has no rows." });
    }

    const schema = inferSchema(rawRows);
    const rows = castRows(rawRows, schema);

    // Each dataset gets its own Mongo collection so queries stay isolated
    const collectionName = `dataset_${new mongoose.Types.ObjectId().toHexString()}`;

    const dataset = await Dataset.create({
      originalFileName: req.file.originalname,
      collectionName,
      rowCount: rows.length,
      columns: schema,
    });

    await mongoose.connection.db.collection(collectionName).insertMany(rows);

    res.status(201).json({
      message: "Dataset uploaded successfully.",
      dataset: {
        id: dataset._id,
        originalFileName: dataset.originalFileName,
        rowCount: dataset.rowCount,
        columns: dataset.columns,
      },
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to process file: ${err.message}` });
  } finally {
    fs.unlink(filePath, () => {}); // clean up temp upload regardless of outcome
  }
}

export async function listDatasets(req, res) {
  const datasets = await Dataset.find().sort({ createdAt: -1 }).select("-columns.sampleValues");
  res.json({ datasets });
}

export async function getDataset(req, res) {
  const dataset = await Dataset.findById(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }
  res.json({ dataset });
}

export async function previewDataset(req, res) {
  const dataset = await Dataset.findById(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }
  const rows = await mongoose.connection.db
    .collection(dataset.collectionName)
    .find({})
    .limit(10)
    .toArray();
  res.json({ rows });
}
import mongoose from "mongoose";
import { Dataset } from "../models/Dataset.js";
import { computeHealth, computeCorrelations } from "../services/healthService.js";

async function load(datasetId) {
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) return {};
  const rows = await mongoose.connection.db
    .collection(dataset.collectionName)
    .find({})
    .limit(50000)
    .toArray();
  return { dataset, rows };
}

export async function getHealth(req, res) {
  try {
    const { dataset, rows } = await load(req.params.datasetId);
    if (!dataset) return res.status(404).json({ error: "Dataset not found." });
    res.json(computeHealth(rows, dataset.columns));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getCorrelations(req, res) {
  try {
    const { dataset, rows } = await load(req.params.datasetId);
    if (!dataset) return res.status(404).json({ error: "Dataset not found." });
    const numeric = dataset.columns.filter((c) => c.type === "number").map((c) => c.name).slice(0, 12);
    res.json(computeCorrelations(rows, numeric));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
import mongoose from "mongoose";
import { Dataset } from "../models/Dataset.js";
import { detectOutliers, forecastTrend } from "../services/mlInsightsService.js";

export async function getOutliers(req, res) {
  const { datasetId } = req.params;
  const { column, threshold } = req.query;

  if (!column) {
    return res.status(400).json({ error: "Query param 'column' is required." });
  }

  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  const columnMeta = dataset.columns.find((c) => c.name === column);
  if (!columnMeta || columnMeta.type !== "number") {
    return res.status(400).json({ error: `Column "${column}" is not a numeric column.` });
  }

  const rows = await mongoose.connection.db
    .collection(dataset.collectionName)
    .find({})
    .toArray();

  try {
    const result = detectOutliers(rows, column, threshold ? parseFloat(threshold) : undefined);
    res.json({
      column,
      mean: result.mean,
      stdDev: result.stdDev,
      outlierCount: result.outliers.length,
      outliers: result.outliers.slice(0, 50),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getForecast(req, res) {
  const { datasetId } = req.params;
  const { dateColumn, valueColumn, periods } = req.query;

  if (!dateColumn || !valueColumn) {
    return res.status(400).json({ error: "Query params 'dateColumn' and 'valueColumn' are required." });
  }

  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  const rows = await mongoose.connection.db
    .collection(dataset.collectionName)
    .find({})
    .toArray();

  try {
    const result = forecastTrend(rows, dateColumn, valueColumn, periods ? parseInt(periods) : undefined);
    res.json({ dateColumn, valueColumn, slope: result.slope, series: result.series });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getNumericColumns(req, res) {
  const { datasetId } = req.params;
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }
  const numericColumns = dataset.columns.filter((c) => c.type === "number").map((c) => c.name);
  const dateColumns = dataset.columns.filter((c) => c.type === "date").map((c) => c.name);
  res.json({ numericColumns, dateColumns });
}
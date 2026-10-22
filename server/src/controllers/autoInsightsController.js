import mongoose from "mongoose";
import { Dataset } from "../models/Dataset.js";
import { ChatService, schemaToPromptText, getAiConfig } from "../services/chatService.js";
import { buildProfileText } from "../services/profileService.js";

const cache = new Map(); // datasetId -> summary (cleared when the server restarts)

export async function getSummary(req, res) {
  const { datasetId } = req.params;

  let ai;
  try {
    ai = getAiConfig();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (!ai.apiKey) return res.status(400).json({ error: `${ai.keyName} is missing in server/.env.` });

  try {
    if (!req.query.refresh && cache.has(datasetId)) return res.json(cache.get(datasetId));

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) return res.status(404).json({ error: "Dataset not found." });

    const rows = await mongoose.connection.db
      .collection(dataset.collectionName)
      .find({})
      .limit(50000)
      .toArray();

    const profile = buildProfileText(rows, dataset.columns);
    const summary = await new ChatService(ai).generateSummary(schemaToPromptText(dataset), profile);
    const payload = { ...summary, generatedAt: new Date().toISOString() };
    cache.set(datasetId, payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: `Could not generate the summary: ${err.message}` });
  }
}
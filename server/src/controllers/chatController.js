import mongoose from "mongoose";
import { Dataset } from "../models/Dataset.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ChatService, schemaToPromptText, buildHistory, getAiConfig } from "../services/chatService.js";

export async function askQuestion(req, res) {
  const { datasetId, question } = req.body;

  if (!datasetId || !question) {
    return res.status(400).json({ error: "datasetId and question are required." });
  }

  let ai;
  try {
    ai = getAiConfig();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (!ai.apiKey) {
    return res.status(400).json({ error: `${ai.keyName} is missing in server/.env.` });
  }

  const dataset = await Dataset.findById(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found." });
  }

  // Load recent turns BEFORE saving the new question, so follow-ups have context.
  const recent = await ChatMessage.find({ datasetId }).sort({ createdAt: -1 }).limit(10);
  const history = buildHistory(recent.reverse());

  await ChatMessage.create({ datasetId, role: "user", content: question });

  const chatService = new ChatService(ai);
  const schemaText = schemaToPromptText(dataset);

  let pipeline;
  try {
    pipeline = await chatService.generatePipeline(question, schemaText, history);
  } catch (err) {
    const errorMsg = `Could not generate a query for that question: ${err.message}`;
    await ChatMessage.create({ datasetId, role: "assistant", content: errorMsg, error: err.message });
    return res.status(200).json({ answer: errorMsg, pipeline: null, result: null, error: err.message });
  }

  let result;
  try {
    result = await mongoose.connection.db
      .collection(dataset.collectionName)
      .aggregate(pipeline)
      .toArray();
  } catch (err) {
    const errorMsg = `The generated query failed to run: ${err.message}`;
    await ChatMessage.create({
      datasetId,
      role: "assistant",
      content: errorMsg,
      pipeline,
      error: err.message,
    });
    return res.status(200).json({ answer: errorMsg, pipeline, result: null, error: err.message });
  }

  let answer;
  try {
    answer = await chatService.explainResult(question, result.slice(0, 20));
  } catch (err) {
    answer = "Here's the result (couldn't generate a plain-English summary right now).";
  }

  await ChatMessage.create({
    datasetId,
    role: "assistant",
    content: answer,
    pipeline,
    resultPreview: result.slice(0, 20),
  });

  res.json({ answer, pipeline, result });
}

export async function getChatHistory(req, res) {
  const { datasetId } = req.params;
  const messages = await ChatMessage.find({ datasetId }).sort({ createdAt: 1 });
  res.json({ messages });
}
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const api = axios.create({
  baseURL: API_URL,
  headers: { "x-gemini-api-key": GEMINI_API_KEY },
});

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/datasets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function listDatasets() {
  const res = await api.get("/datasets");
  return res.data.datasets;
}

export async function previewDataset(datasetId) {
  const res = await api.get(`/datasets/${datasetId}/preview`);
  return res.data.rows;
}

export async function askQuestion(datasetId, question) {
  const res = await api.post("/chat/ask", { datasetId, question });
  return res.data;
}

export async function getChatHistory(datasetId) {
  const res = await api.get(`/chat/${datasetId}/history`);
  return res.data.messages;
}

export async function getInsightColumns(datasetId) {
  const res = await api.get(`/insights/${datasetId}/columns`);
  return res.data;
}

export async function getOutliers(datasetId, column, threshold) {
  const res = await api.get(`/insights/${datasetId}/outliers`, {
    params: { column, threshold },
  });
  return res.data;
}

export async function getForecast(datasetId, dateColumn, valueColumn, periods) {
  const res = await api.get(`/insights/${datasetId}/forecast`, {
    params: { dateColumn, valueColumn, periods },
  });
  return res.data;
}
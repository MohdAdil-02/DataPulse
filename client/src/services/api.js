import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = rawUrl.replace(/\/+$/, "").replace(/\/api$/, "") + "/api";

const api = axios.create({ baseURL: API_URL });

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/datasets/upload", formData);
  return res.data;
}
export async function listDatasets() {
  return (await api.get("/datasets")).data.datasets;
}
export async function previewDataset(id) {
  return (await api.get(`/datasets/${id}/preview`)).data.rows;
}
export async function askQuestion(datasetId, question) {
  return (await api.post("/chat/ask", { datasetId, question })).data;
}
export async function getChatHistory(datasetId) {
  return (await api.get(`/chat/${datasetId}/history`)).data.messages;
}
export async function getInsightColumns(datasetId) {
  return (await api.get(`/insights/${datasetId}/columns`)).data;
}
export async function getOutliers(datasetId, column, threshold) {
  return (await api.get(`/insights/${datasetId}/outliers`, { params: { column, threshold } })).data;
}
export async function getForecast(datasetId, dateColumn, valueColumn, periods) {
  return (await api.get(`/insights/${datasetId}/forecast`, { params: { dateColumn, valueColumn, periods } })).data;
}
export async function getHealth(datasetId) {
  return (await api.get(`/insights/${datasetId}/health`)).data;
}
export async function getCorrelations(datasetId) {
  return (await api.get(`/insights/${datasetId}/correlations`)).data;
}
export async function getSummary(datasetId, refresh = false) {
  return (await api.get(`/insights/${datasetId}/summary`, { params: refresh ? { refresh: 1 } : {} })).data;
}
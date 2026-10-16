import { useState } from "react";
import { uploadDataset } from "../services/api";

export default function DatasetUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uploadDataset(file);
      onUploaded(data.dataset);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="upload-box">
      <div className="upload-eyebrow">Data exploration chatbot</div>
      <h2>Bring your data. Ask it anything.</h2>
      <p>Upload a CSV or Excel file and get plain-English answers, charts, and insights — no queries to write.</p>

      <div
        className={`dropzone ${dragActive ? "drag-active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="dropzone-icon">⌘</div>
        <p>Drag a file here</p>
        <label className="file-picker-label">
          or choose a file
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {file && <div className="selected-file">{file.name}</div>}
      </div>

      <button className="primary" onClick={handleUpload} disabled={!file || loading}>
        {loading ? "Uploading…" : "Upload dataset"}
      </button>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
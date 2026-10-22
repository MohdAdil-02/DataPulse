import { useState } from "react";
import { uploadDataset } from "../services/api";

export default function DatasetUpload({ onUploaded, recent = [], onOpen }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uploadDataset(file);
      onUploaded(data.dataset);
    } catch (err) {
      setError(err.response?.data?.error || (err.code === "ERR_NETWORK" ? "Can't reach the server. Start it with npm run dev in the server folder." : err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-box">
      <div className="brand big"><span className="brand-mark" />DataPulse</div>
      <h1>Bring your data. Ask it anything.</h1>
      <p className="lede">Upload a CSV or Excel file and get answers, charts and forecasts in plain English. No queries to write.</p>

      <div
        className={`dropzone ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
      >
        <div className="dz-icon">⬆</div>
        {file ? (
          <p className="dz-file">{file.name} <span>({(file.size / 1024).toFixed(1)} KB)</span></p>
        ) : (
          <p>Drop a .csv or .xlsx file here</p>
        )}
        <label className="link">
          {file ? "Choose a different file" : "or browse your computer"}
          <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => setFile(e.target.files[0])} />
        </label>
      </div>

      <button className="btn-primary wide" onClick={handleUpload} disabled={!file || loading}>
        {loading ? "Analysing your file…" : "Upload and start chatting"}
      </button>
      {error && <div className="error-banner">{error}</div>}

      {recent.length > 0 && (
        <div className="recent">
          <span className="label">Continue with a previous dataset</span>
          {recent.slice(0, 4).map((d) => (
            <button key={d.id} className="recent-item" onClick={() => onOpen(d)}>
              <span>{d.originalFileName}</span>
              <em>{d.rowCount?.toLocaleString()} rows</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

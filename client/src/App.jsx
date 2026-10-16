import { useState } from "react";
import DatasetUpload from "./components/DatasetUpload";
import ChatWindow from "./components/ChatWindow";
import InsightsPanel from "./components/InsightsPanel";
import "./App.css";

function App() {
  const [dataset, setDataset] = useState(null);

  if (!dataset) {
    return (
      <div className="upload-shell">
        <DatasetUpload onUploaded={setDataset} />
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">📊</span>
          DataPulse
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">ACTIVE DATASET</span>
          <div className="dataset-card">
            <div className="dataset-name">{dataset.originalFileName}</div>
            <div className="dataset-meta">
              {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} columns
            </div>
            <div className="column-chip-list">
              {dataset.columns.slice(0, 8).map((c) => (
                <span key={c.name} className="column-chip">{c.name}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <InsightsPanel dataset={dataset} />
        </div>

        <button className="sidebar-link" onClick={() => setDataset(null)}>
          ← Upload a different dataset
        </button>
      </aside>

      <main className="main">
        <div className="main-header">
          <div>
            <div className="main-title">Ask about your data</div>
          </div>
          <div className="main-subtitle">gemini-2.5-flash</div>
        </div>
        <ChatWindow dataset={dataset} />
      </main>
    </div>
  );
}

export default App;
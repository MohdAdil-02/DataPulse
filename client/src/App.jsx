import { useState, useEffect } from "react";
import DatasetUpload from "./components/DatasetUpload";
import ChatWindow from "./components/ChatWindow";
import InsightsPanel from "./components/InsightsPanel";
import DataPreview from "./components/DataPreview";
import HealthReport from "./components/HealthReport";
import Dashboard from "./components/Dashboard";
import AutoInsights from "./components/AutoInsights";
import { usePins } from "./usePins";
import { listDatasets } from "./services/api";
import "./App.css";

const TABS = [["chat", "Chat"], ["summary", "AI Summary"], ["dash", "Dashboard"], ["data", "Data"], ["health", "Health"], ["insights", "Insights"]];
const norm = (d) => ({ ...d, id: d.id || d._id });

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [recent, setRecent] = useState([]);
  const [tab, setTab] = useState("chat");
  const [pendingQ, setPendingQ] = useState(null);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("dp-theme") || "dark"; } catch { return "dark"; } });
  const { pins, isPinned, addPin, removePin, clearPins } = usePins(dataset?.id);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("dp-theme", theme); } catch { /* storage unavailable */ }
  }, [theme]);

  useEffect(() => { listDatasets().then((l) => setRecent(l.map(norm))).catch(() => {}); }, [dataset]);

  const open = (d) => { setDataset(norm(d)); setTab("chat"); };
  const themeBtn = <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? "☀" : "☾"}</button>;

  if (!dataset) {
    return (
      <div className="upload-shell">
        <div className="corner">{themeBtn}</div>
        <DatasetUpload onUploaded={open} recent={recent} onOpen={open} />
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark" />DataPulse</div>
        <button className="btn-ghost wide" onClick={() => setDataset(null)}>+ New dataset</button>

        <div>
          <span className="label">Active dataset</span>
          <div className="ds-card">
            <strong title={dataset.originalFileName}>{dataset.originalFileName}</strong>
            <span>{dataset.rowCount?.toLocaleString()} rows · {dataset.columns.length} columns</span>
            <div className="tags">{dataset.columns.slice(0, 8).map((c) => <i key={c.name} className={c.type}>{c.name}</i>)}</div>
          </div>
        </div>

        {recent.length > 1 && (
          <div>
            <span className="label">Recent</span>
            <div className="recent-list">
              {recent.filter((d) => d.id !== dataset.id).slice(0, 5).map((d) => (
                <button key={d.id} onClick={() => open(d)}>{d.originalFileName}</button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <nav className="tabs">
            {TABS.map(([k, label]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                {label}{k === "dash" && pins.length > 0 && <span className="count">{pins.length}</span>}
              </button>
            ))}
          </nav>
          {themeBtn}
        </header>
        <div className="content">
          {tab === "chat" && <ChatWindow key={dataset.id} dataset={dataset} onPin={addPin} isPinned={isPinned} pendingQuestion={pendingQ} onConsumed={() => setPendingQ(null)} />}
          {tab === "summary" && <AutoInsights dataset={dataset} onAsk={(q) => { setPendingQ(q); setTab("chat"); }} />}
          {tab === "dash" && <Dashboard dataset={dataset} pins={pins} onRemove={removePin} onClear={clearPins} />}
          {tab === "data" && <DataPreview dataset={dataset} />}
          {tab === "health" && <HealthReport dataset={dataset} />}
          {tab === "insights" && <InsightsPanel dataset={dataset} />}
        </div>
      </main>
    </div>
  );
}
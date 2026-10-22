import { useEffect, useState } from "react";
import { previewDataset } from "../services/api";
import { fmt } from "../utils";

export default function DataPreview({ dataset }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { previewDataset(dataset.id).then(setRows).catch(() => setRows([])); }, [dataset.id]);

  return (
    <div className="page">
      <h2>Columns</h2>
      <div className="col-grid">
        {dataset.columns.map((c) => (
          <div key={c.name} className="col-card">
            <div className="col-top"><strong>{c.name}</strong><span className={`type ${c.type}`}>{c.type}</span></div>
            <div className="col-sample">{(c.sampleValues || []).slice(0, 3).map(fmt).join(" · ")}</div>
          </div>
        ))}
      </div>
      <h2>First {rows.length} rows</h2>
      <div className="table-wrap">
        <table>
          <thead><tr>{dataset.columns.map((c) => <th key={c.name}>{c.name}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{dataset.columns.map((c) => <td key={c.name}>{c.type === "date" && r[c.name] ? String(r[c.name]).slice(0, 10) : fmt(r[c.name])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import ResultChart from "./ResultChart";
import { fmt } from "../utils";

export default function Dashboard({ dataset, pins, onRemove, onClear }) {
  if (pins.length === 0) {
    return (
      <div className="page">
        <div className="empty-dash">
          <div className="empty-icon">📌</div>
          <h2>Your dashboard is empty</h2>
          <p>In the Chat tab, ask a question and press <b>Pin to dashboard</b> under any answer that has a table or chart. Pinned results collect here as a report you can print or save as PDF.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page wide">
      <div className="dash-head">
        <div>
          <h1>{dataset.originalFileName}</h1>
          <p className="muted">Report generated {new Date().toLocaleDateString(undefined, { dateStyle: "long" })} · {pins.length} pinned insight{pins.length > 1 ? "s" : ""}</p>
        </div>
        <div className="dash-actions">
          <button className="btn-ghost" onClick={onClear}>Clear all</button>
          <button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
      </div>

      <div className="dash-grid">
        {pins.map((p) => (
          <article key={p.id} className="dash-card">
            <header>
              <h3>{p.title}</h3>
              <button className="pin-remove" onClick={() => onRemove(p.id)} title="Remove from dashboard">✕</button>
            </header>
            <p className="dash-answer">{p.answer}</p>
            <ResultChart result={p.rows} />
            <div className="table-wrap">
              <table>
                <thead><tr>{Object.keys(p.rows[0]).filter((k) => k !== "_id").map((k) => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>
                  {p.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>{Object.entries(r).filter(([k]) => k !== "_id").map(([k, v]) => <td key={k}>{fmt(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
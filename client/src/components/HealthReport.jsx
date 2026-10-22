import { useEffect, useMemo, useState } from "react";
import { getHealth, getCorrelations } from "../services/api";
import { fmt } from "../utils";

const tone = (s) => (s >= 80 ? "good" : s >= 60 ? "warn" : "bad");
const verdict = (s) => (s >= 80 ? "Healthy" : s >= 60 ? "Needs attention" : "Poor quality");
const strength = (r) => {
  const a = Math.abs(r);
  return `${a >= 0.7 ? "strong" : a >= 0.4 ? "moderate" : "weak"} ${r >= 0 ? "positive" : "negative"}`;
};

function ScoreRing({ score }) {
  const r = 48, c = 2 * Math.PI * r;
  return (
    <svg width="124" height="124" viewBox="0 0 124 124" className={`ring ${tone(score)}`}>
      <circle cx="62" cy="62" r={r} className="ring-bg" />
      <circle cx="62" cy="62" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 62 62)" />
      <text x="62" y="62" textAnchor="middle" dominantBaseline="central" className="ring-num">{score}</text>
    </svg>
  );
}

export default function HealthReport({ dataset }) {
  const [health, setHealth] = useState(null);
  const [corr, setCorr] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHealth(null); setCorr(null); setError(null);
    getHealth(dataset.id).then(setHealth).catch((e) => setError(e.response?.data?.error || e.message));
    getCorrelations(dataset.id).then(setCorr).catch(() => {});
  }, [dataset.id]);

  const pairs = useMemo(() => {
    if (!corr) return [];
    const out = [];
    corr.columns.forEach((a, i) => corr.columns.forEach((b, j) => {
      if (j > i && corr.matrix[i][j] !== null) out.push({ a, b, r: corr.matrix[i][j] });
    }));
    return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r)).slice(0, 3);
  }, [corr]);

  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;
  if (!health) return <div className="page"><p className="muted">Analysing data quality…</p></div>;

  const cellStyle = (v) => {
    if (v === null) return {};
    const pct = Math.round(Math.abs(v) * 85);
    return { background: `color-mix(in srgb, var(${v >= 0 ? "--accent" : "--bad"}) ${pct}%, transparent)` };
  };

  return (
    <div className="page">
      <div className="health-hero">
        <ScoreRing score={health.score} />
        <div>
          <span className="label">Data quality score</span>
          <h2 className={`verdict ${tone(health.score)}`}>{verdict(health.score)}</h2>
          <p className="muted">{health.rowCount.toLocaleString()} rows · {health.columns.length} columns · {health.duplicateRows} duplicate row(s) · {health.issues.length} issue(s) found</p>
        </div>
      </div>

      <h2>Issues</h2>
      {health.issues.length === 0 ? (
        <p className="muted">No problems detected. This dataset looks clean.</p>
      ) : (
        <ul className="issues">
          {health.issues.map((i, k) => <li key={k} className={i.severity}><b>{i.severity}</b>{i.message}</li>)}
        </ul>
      )}

      <h2>Column completeness</h2>
      <div className="comp-list">
        {health.columns.map((c) => (
          <div key={c.name} className="comp-row">
            <span className="comp-name">{c.name}</span>
            <div className="bar"><div style={{ width: `${100 - c.missingPct}%` }} className={c.missingPct >= 30 ? "bad" : c.missingPct >= 5 ? "warn" : "good"} /></div>
            <span className="comp-pct">{(100 - c.missingPct).toFixed(1)}%</span>
            <span className="comp-meta">{c.unique.toLocaleString()} unique{c.mean !== undefined ? ` · mean ${fmt(c.mean)}` : ""}</span>
          </div>
        ))}
      </div>

      <h2>Correlation heatmap</h2>
      {!corr || corr.columns.length < 2 ? (
        <p className="muted">At least two numeric columns are needed to compare relationships.</p>
      ) : (
        <>
          <div className="heat" style={{ gridTemplateColumns: `110px repeat(${corr.columns.length}, minmax(58px, 1fr))` }}>
            <span />
            {corr.columns.map((c) => <span key={c} className="heat-h" title={c}>{c}</span>)}
            {corr.columns.map((rowName, i) => (
              <div key={rowName} style={{ display: "contents" }}>
                <span className="heat-h left" title={rowName}>{rowName}</span>
                {corr.matrix[i].map((v, j) => (
                  <span key={j} className="heat-cell" style={cellStyle(v)} title={`${rowName} vs ${corr.columns[j]}`}>{v === null ? "–" : v.toFixed(2)}</span>
                ))}
              </div>
            ))}
          </div>
          {pairs.length > 0 && (
            <ul className="pairs">
              {pairs.map((p) => <li key={p.a + p.b}><b>{p.a}</b> and <b>{p.b}</b>: {strength(p.r)} relationship (r = {p.r.toFixed(2)})</li>)}
            </ul>
          )}
          <p className="muted">Blue means the columns rise together, red means one rises as the other falls. Correlation does not prove one causes the other.</p>
        </>
      )}
    </div>
  );
}
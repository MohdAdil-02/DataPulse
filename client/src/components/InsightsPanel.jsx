import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getInsightColumns, getOutliers, getForecast } from "../services/api";
import { fmt } from "../utils";
import { PALETTE } from "./ResultChart";

export default function InsightsPanel({ dataset }) {
  const [cols, setCols] = useState({ numericColumns: [], dateColumns: [] });
  const [num, setNum] = useState("");
  const [date, setDate] = useState("");
  const [threshold, setThreshold] = useState(2.5);
  const [outliers, setOutliers] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInsightColumns(dataset.id).then((d) => { setCols(d); setNum(d.numericColumns[0] || ""); setDate(d.dateColumns[0] || ""); }).catch(() => {});
    setOutliers(null); setForecast(null);
  }, [dataset.id]);

  async function run(kind) {
    setBusy(true); setError(null);
    try {
      if (kind === "out") { setOutliers(await getOutliers(dataset.id, num, threshold)); }
      else { setForecast(await getForecast(dataset.id, date, num, 7)); }
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  const series = useMemo(() => {
    if (!forecast) return [];
    const lastActual = forecast.series.map((p) => p.type).lastIndexOf("actual");
    return forecast.series.map((p, i) => ({
      date: p.date,
      Actual: p.type === "actual" ? p.value : null,
      Forecast: p.type === "forecast" || i === lastActual ? p.value : null,
    }));
  }, [forecast]);

  if (cols.numericColumns.length === 0) return <div className="page"><p className="muted">This dataset has no numeric columns, so there is nothing to analyse yet.</p></div>;

  return (
    <div className="page">
      <div className="insight-controls">
        <label>Measure
          <select value={num} onChange={(e) => setNum(e.target.value)}>{cols.numericColumns.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        {cols.dateColumns.length > 0 && (
          <label>Date
            <select value={date} onChange={(e) => setDate(e.target.value)}>{cols.dateColumns.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        )}
        <label>Outlier sensitivity <b>{threshold}σ</b>
          <input type="range" min="1.5" max="4" step="0.5" value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
        </label>
        <button className="btn-primary" disabled={busy} onClick={() => run("out")}>Find outliers</button>
        {cols.dateColumns.length > 0 && <button className="btn-ghost" disabled={busy} onClick={() => run("fc")}>Forecast next 7 periods</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}

      {outliers && (
        <section>
          <div className="kpis">
            <div className="kpi"><span>Mean</span><b>{fmt(outliers.mean)}</b></div>
            <div className="kpi"><span>Std deviation</span><b>{fmt(outliers.stdDev)}</b></div>
            <div className={`kpi ${outliers.outlierCount ? "warn" : "good"}`}><span>Outliers</span><b>{outliers.outlierCount}</b></div>
          </div>
          {outliers.outliers.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr>{Object.keys(outliers.outliers[0]).filter((k) => k !== "_id").map((k) => <th key={k}>{k}</th>)}</tr></thead>
                <tbody>{outliers.outliers.slice(0, 15).map((r, i) => <tr key={i}>{Object.entries(r).filter(([k]) => k !== "_id").map(([k, v]) => <td key={k}>{k === date || String(v).includes("T00:") ? String(v).slice(0, 10) : fmt(v)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : <p className="muted">No values in "{outliers.column}" sit beyond {threshold} standard deviations.</p>}
        </section>
      )}

      {forecast && (
        <section>
          <div className="kpis">
            <div className={`kpi ${forecast.slope >= 0 ? "good" : "warn"}`}><span>Trend per period</span><b>{forecast.slope >= 0 ? "+" : ""}{fmt(+forecast.slope.toFixed(2))}</b></div>
            <div className="kpi"><span>Direction</span><b>{forecast.slope >= 0 ? "Increasing" : "Decreasing"}</b></div>
          </div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="Actual" stroke={PALETTE[0]} strokeWidth={2.5} dot={false} connectNulls={false} />
                <Line dataKey="Forecast" stroke={PALETTE[3]} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="muted">Linear-trend projection. Treat it as a direction indicator, not a precise prediction.</p>
        </section>
      )}
    </div>
  );
}

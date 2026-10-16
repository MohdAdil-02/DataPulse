import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot
} from "recharts";
import { getInsightColumns, getOutliers, getForecast } from "../services/api";

export default function InsightsPanel({ dataset }) {
  const [columns, setColumns] = useState({ numericColumns: [], dateColumns: [] });
  const [selectedColumn, setSelectedColumn] = useState("");
  const [selectedDateColumn, setSelectedDateColumn] = useState("");
  const [outlierResult, setOutlierResult] = useState(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dataset) return;
    getInsightColumns(dataset.id).then((data) => {
      setColumns(data);
      setSelectedColumn(data.numericColumns[0] || "");
      setSelectedDateColumn(data.dateColumns[0] || "");
    });
  }, [dataset]);

  async function runOutlierDetection() {
    if (!selectedColumn) return;
    setLoading(true);
    setError(null);
    setOutlierResult(null);
    try {
      const data = await getOutliers(dataset.id, selectedColumn);
      setOutlierResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runForecast() {
    if (!selectedColumn || !selectedDateColumn) return;
    setLoading(true);
    setError(null);
    setForecastResult(null);
    try {
      const data = await getForecast(dataset.id, selectedDateColumn, selectedColumn, 5);
      setForecastResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!dataset) return null;
  if (columns.numericColumns.length === 0) {
    return <p className="insights-empty">No numeric columns available for insights.</p>;
  }

  return (
    <div className="insights-panel">
      <span className="sidebar-label">ML INSIGHTS</span>

      <div className="insights-controls">
        <label>
          Numeric column:
          <select value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)}>
            {columns.numericColumns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {columns.dateColumns.length > 0 && (
          <label>
            Date column:
            <select value={selectedDateColumn} onChange={(e) => setSelectedDateColumn(e.target.value)}>
              {columns.dateColumns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}

        <button onClick={runOutlierDetection} disabled={loading}>Detect Outliers</button>
        {columns.dateColumns.length > 0 && (
          <button onClick={runForecast} disabled={loading}>Forecast Trend</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {outlierResult && (
        <div className="insight-result">
          <p>
            Mean: {outlierResult.mean.toFixed(2)}, Std Dev: {outlierResult.stdDev.toFixed(2)} —{" "}
            <strong>{outlierResult.outlierCount} outlier(s)</strong> found in "{outlierResult.column}".
          </p>
          {outlierResult.outliers.length > 0 && (
            <table>
              <thead>
                <tr>
                  {Object.keys(outlierResult.outliers[0]).filter(k => k !== '_id').map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outlierResult.outliers.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.entries(row).filter(([k]) => k !== '_id').map(([k, v]) => (
                      <td key={k}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {forecastResult && (
        <div className="insight-result">
          <p>
            Trend slope: {forecastResult.slope.toFixed(3)} per period ({forecastResult.slope > 0 ? "increasing" : "decreasing"})
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={forecastResult.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={(props) => {
                  const isForecast = forecastResult.series[props.index]?.type === "forecast";
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill={isForecast ? "#f59e0b" : "#4f46e5"}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-note">🟠 Orange points are forecasted (projected) values.</p>
        </div>
      )}
    </div>
  );
}
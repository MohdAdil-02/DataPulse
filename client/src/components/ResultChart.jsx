import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ResultChart({ result }) {
  const chartConfig = analyzeResult(result);
  if (!chartConfig) return null;

  const { type, xKey, yKey, data } = chartConfig;

  return (
    <div className="result-chart">
      <ResponsiveContainer width="100%" height={280}>
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey={yKey} fill="#4f46e5" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Heuristic chart selection, mirroring the logic used in the Python prototype:
 * - Needs at least 2 rows to be worth charting.
 * - Picks the first non-numeric field as the x-axis (category/date) and the
 *   first numeric field as the y-axis (value).
 * - Uses a line chart if the x-axis field looks like a date, else a bar chart.
 * - Returns null (no chart) if the result isn't in a chartable shape.
 */
function analyzeResult(result) {
  if (!Array.isArray(result) || result.length < 2) return null;

  const sample = result[0];
  const keys = Object.keys(sample);
  if (keys.length < 2) return null;

  const numericKey = keys.find((k) => typeof sample[k] === "number");
  const nonNumericKey = keys.find((k) => k !== numericKey);

  if (!numericKey || !nonNumericKey) return null;

  const xKey = nonNumericKey === "_id" ? "_id" : nonNumericKey;
  const looksLikeDate = looksLikeDateValue(sample[xKey]);

  // Recharts needs plain primitives for axis keys; stringify _id if it's an object (e.g. grouped date parts)
  const data = result.map((row) => ({
    ...row,
    [xKey]: typeof row[xKey] === "object" ? JSON.stringify(row[xKey]) : row[xKey],
  }));

  return {
    type: looksLikeDate ? "line" : "bar",
    xKey,
    yKey: numericKey,
    data,
  };
}

function looksLikeDateValue(value) {
  if (!value) return false;
  if (value instanceof Date) return true;
  if (typeof value === "string" && !isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}/.test(value)) {
    return true;
  }
  return false;
}
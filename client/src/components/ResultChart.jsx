import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export const PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#f472b6", "#60a5fa", "#2dd4bf"];

function analyze(result) {
  if (!Array.isArray(result) || result.length < 2) return null;
  const keys = Object.keys(result[0]);
  const yKey = keys.find((k) => typeof result[0][k] === "number");
  const xKey = keys.find((k) => k !== yKey);
  if (!yKey || !xKey) return null;
  const data = result.map((r) => ({
    ...r,
    [xKey]: r[xKey] !== null && typeof r[xKey] === "object" ? Object.values(r[xKey]).join("-") : r[xKey],
  }));
  const isDate = typeof data[0][xKey] === "string" && /^\d{4}-\d{2}/.test(data[0][xKey]);
  return { xKey, yKey, data, type: isDate ? "line" : "bar" };
}

const TYPES = [["bar", "Bar"], ["line", "Line"], ["area", "Area"], ["pie", "Pie"]];
const tip = { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

export default function ResultChart({ result }) {
  const cfg = useMemo(() => analyze(result), [result]);
  const [type, setType] = useState(cfg?.type || "bar");
  if (!cfg) return null;
  const { xKey, yKey, data } = cfg;
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
      <Tooltip contentStyle={tip} cursor={{ fill: "rgba(128,128,128,.08)" }} />
    </>
  );

  return (
    <div className="chart-card">
      <div className="chart-toolbar">
        <span className="chart-title">{yKey} by {xKey}</span>
        <div className="seg">
          {TYPES.map(([k, label]) => (
            <button key={k} className={type === k ? "on" : ""} onClick={() => setType(k)}>{label}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {type === "line" ? (
          <LineChart data={data}>{axes}<Line type="monotone" dataKey={yKey} stroke={PALETTE[0]} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart>
        ) : type === "area" ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.5} />
                <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            {axes}<Area type="monotone" dataKey={yKey} stroke={PALETTE[0]} strokeWidth={2} fill="url(#ag)" />
          </AreaChart>
        ) : type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} innerRadius={55} outerRadius={95} paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : (
          <BarChart data={data}>
            {axes}
            <Bar dataKey={yKey} radius={[5, 5, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

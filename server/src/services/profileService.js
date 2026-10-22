import { computeHealth, computeCorrelations } from "./healthService.js";

const isMissing = (v) => v === null || v === undefined || v === "";

export function buildProfileText(rows, columns) {
  const health = computeHealth(rows, columns);
  const lines = [
    `Rows: ${health.rowCount}`,
    `Duplicate rows: ${health.duplicateRows}`,
    `Data quality score: ${health.score}/100`,
    "Columns:",
  ];

  for (const c of health.columns) {
    let line = `- ${c.name} (${c.type}): ${c.missingPct}% missing, ${c.unique} unique`;
    if (c.type === "number" && c.mean !== undefined) {
      line += `, min ${c.min}, max ${c.max}, mean ${c.mean}, std ${c.std}, ${c.outliers} extreme values`;
    }
    if (c.type === "string" && c.unique <= 20) {
      const counts = {};
      for (const r of rows) {
        const v = r[c.name];
        if (!isMissing(v)) counts[v] = (counts[v] || 0) + 1;
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(", ");
      line += `; most common: ${top}`;
    }
    if (c.type === "date") {
      const times = rows.map((r) => r[c.name]).filter((v) => !isMissing(v)).map((d) => new Date(d).getTime()).filter((t) => !isNaN(t));
      if (times.length) {
        const min = times.reduce((a, b) => (b < a ? b : a), times[0]);
        const max = times.reduce((a, b) => (b > a ? b : a), times[0]);
        line += `, spans ${new Date(min).toISOString().slice(0, 10)} to ${new Date(max).toISOString().slice(0, 10)}`;
      }
    }
    lines.push(line);
  }

  const numeric = health.columns.filter((c) => c.type === "number").map((c) => c.name).slice(0, 12);
  if (numeric.length >= 2) {
    const corr = computeCorrelations(rows, numeric);
    const pairs = [];
    corr.columns.forEach((a, i) => corr.columns.forEach((b, j) => {
      if (j > i && corr.matrix[i][j] !== null && Math.abs(corr.matrix[i][j]) >= 0.4) pairs.push(`${a} vs ${b}: r=${corr.matrix[i][j]}`);
    }));
    if (pairs.length) lines.push("Notable correlations:", ...pairs.slice(0, 5).map((p) => `- ${p}`));
  }
  return lines.join("\n");
}
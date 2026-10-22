const isMissing = (v) => v === null || v === undefined || v === "";
const r2 = (x) => Math.round(x * 100) / 100;

export function computeHealth(rows, columns) {
  const n = rows.length;
  if (n === 0) throw new Error("Dataset is empty.");

  const stats = columns.map((c) => {
    const present = rows.map((r) => r[c.name]).filter((v) => !isMissing(v));
    const missing = n - present.length;
    const unique = new Set(present.map((v) => (v instanceof Date ? v.getTime() : v))).size;
    const info = { name: c.name, type: c.type, missing, missingPct: r2((missing / n) * 100), unique, outliers: 0 };

    if (c.type === "number" && present.length) {
      const mean = present.reduce((a, b) => a + b, 0) / present.length;
      const std = Math.sqrt(present.reduce((a, b) => a + (b - mean) ** 2, 0) / present.length);
      info.min = present.reduce((a, b) => (b < a ? b : a), present[0]);
      info.max = present.reduce((a, b) => (b > a ? b : a), present[0]);
      info.mean = r2(mean);
      info.std = r2(std);
      if (std > 0) info.outliers = present.filter((v) => Math.abs(v - mean) / std > 3).length;
    }
    return info;
  });

  const seen = new Set();
  let duplicateRows = 0;
  for (const row of rows) {
    const { _id, ...rest } = row;
    const key = JSON.stringify(rest);
    if (seen.has(key)) duplicateRows++;
    else seen.add(key);
  }

  const issues = [];
  for (const s of stats) {
    if (s.missingPct >= 30) issues.push({ severity: "high", message: `"${s.name}" is missing ${s.missingPct}% of its values.` });
    else if (s.missingPct >= 5) issues.push({ severity: "medium", message: `"${s.name}" has ${s.missingPct}% missing values.` });
    if (s.unique === 1 && n > 1) issues.push({ severity: "medium", message: `"${s.name}" has the same value in every row, so it adds no information.` });
    if (s.type === "string" && s.unique === n && n > 20) issues.push({ severity: "low", message: `"${s.name}" looks like an ID column (every value is unique).` });
    if (s.outliers > 0) issues.push({ severity: "low", message: `"${s.name}" has ${s.outliers} extreme value(s) beyond 3 standard deviations.` });
  }
  if (duplicateRows > 0) issues.push({ severity: duplicateRows / n > 0.05 ? "high" : "medium", message: `${duplicateRows} duplicate row(s) found.` });

  const avgMissing = stats.reduce((a, s) => a + s.missingPct, 0) / stats.length;
  const constants = stats.filter((s) => s.unique === 1 && n > 1).length;
  const outlierCols = stats.filter((s) => s.outliers > 0).length;
  const penalty =
    Math.min(40, avgMissing * 1.5) +
    Math.min(20, (duplicateRows / n) * 100 * 2) +
    Math.min(15, constants * 5) +
    Math.min(10, outlierCols * 3);
  const score = Math.max(0, Math.round(100 - penalty));

  const order = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return { rowCount: n, duplicateRows, score, columns: stats, issues };
}

function pearson(rows, a, b) {
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (const r of rows) {
    const x = r[a], y = r[b];
    if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) continue;
    n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
  }
  if (n < 3) return null;
  const cov = sab - (sa * sb) / n;
  const va = saa - (sa * sa) / n;
  const vb = sbb - (sb * sb) / n;
  if (va <= 0 || vb <= 0) return null;
  return r2(cov / Math.sqrt(va * vb));
}

export function computeCorrelations(rows, numericCols) {
  const matrix = numericCols.map((a) => numericCols.map((b) => (a === b ? 1 : pearson(rows, a, b))));
  return { columns: numericCols, matrix };
}
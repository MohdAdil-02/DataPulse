export function toCSV(rows) {
  if (!rows?.length) return "";
  const keys = Object.keys(rows[0]).filter((k) => k !== "_id");
  const esc = (v) => {
    const s = v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function downloadCSV(rows, name = "result") {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const fmt = (v) =>
  typeof v === "number" ? (Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })) : v !== null && typeof v === "object" ? Object.values(v).join("-") : String(v ?? "—");

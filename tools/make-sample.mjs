// Creates sample-data/sample_sales.csv (90 daily rows, rising trend, 3 planted outliers).
// Run from the project root:  node tools/make-sample.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "sample-data");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Small seeded random generator so the file is the same every time.
let seed = 7;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const categories = ["Electronics", "Clothing", "Groceries", "Furniture"];
const regions = ["North", "South", "East", "West"];
const base = { Electronics: 900, Clothing: 450, Groceries: 300, Furniture: 700 };

const rows = [];
for (let i = 0; i < 90; i++) {
  const d = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
  const category = pick(categories);
  const sales = base[category] + i * 2.5 + (rand() * 160 - 80);
  rows.push([d, category, pick(regions), +sales.toFixed(2), 3 + Math.floor(rand() * 38)]);
}
rows[20][3] = 6200.0;
rows[47][3] = 5800.5;
rows[71][3] = 7100.25;

const csv = ["date,category,region,sales,units_sold", ...rows.map((r) => r.join(","))].join("\n") + "\n";
fs.writeFileSync(path.join(OUT_DIR, "sample_sales.csv"), csv);
console.log(`Wrote ${rows.length} rows to sample-data/sample_sales.csv`);
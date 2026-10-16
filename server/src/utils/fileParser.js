import fs from "fs";
import csvParser from "csv-parser";
import XLSX from "xlsx";
import path from "path";

/**
 * Parse an uploaded file (CSV or Excel) into an array of plain JS objects.
 * Each object represents one row, keyed by column name.
 */
export async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    return parseCSV(filePath);
  }
  if (ext === ".xlsx" || ext === ".xls") {
    return parseExcel(filePath);
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

/**
 * Infer a simple schema (column name -> type + sample values) from parsed rows.
 */
export function inferSchema(rows, sampleSize = 3) {
  if (rows.length === 0) return [];

  const columnNames = Object.keys(rows[0]);

  return columnNames.map((name) => {
    const values = rows.map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== "");
    const type = inferType(values);
    const sampleValues = [...new Set(values)].slice(0, sampleSize);
    return { name, type, sampleValues };
  });
}

function inferType(values) {
  if (values.length === 0) return "string";

  const sample = values.slice(0, 20);
  const allNumbers = sample.every((v) => !isNaN(parseFloat(v)) && isFinite(v));
  if (allNumbers) return "number";

  const allDates = sample.every((v) => !isNaN(Date.parse(v)));
  if (allDates) return "date";

  const allBooleans = sample.every((v) => typeof v === "boolean" || v === "true" || v === "false");
  if (allBooleans) return "boolean";

  return "string";
}

/**
 * Cast raw parsed values (CSV gives everything as strings) to their inferred
 * JS types before inserting into MongoDB, so numeric/date queries work correctly.
 */
export function castRows(rows, schema) {
  const typeByColumn = Object.fromEntries(schema.map((c) => [c.name, c.type]));

  return rows.map((row) => {
    const casted = {};
    for (const [key, value] of Object.entries(row)) {
      const type = typeByColumn[key];
      if (value === null || value === undefined || value === "") {
        casted[key] = null;
      } else if (type === "number") {
        casted[key] = parseFloat(value);
      } else if (type === "date") {
        casted[key] = new Date(value);
      } else if (type === "boolean") {
        casted[key] = value === true || value === "true";
      } else {
        casted[key] = String(value);
      }
    }
    return casted;
  });
}
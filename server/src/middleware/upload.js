import multer from "multer";
import path from "path";
import fs from "fs";

fs.mkdirSync("uploads", { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedExtensions = [".csv", ".xlsx", ".xls"];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
        cb(Object.assign(new Error(`Unsupported file type: ${ext || "unknown"}. Use CSV or Excel.`), { status: 400 }));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
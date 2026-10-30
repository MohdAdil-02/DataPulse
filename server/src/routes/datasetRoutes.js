import express from "express";
import { upload } from "../middleware/upload.js";
import { validateObjectId } from "../middleware/validateId.js";
import {
  uploadDataset,
  listDatasets,
  getDataset,
  previewDataset,
} from "../controllers/datasetController.js";

const router = express.Router();
router.param("id", validateObjectId);

router.post("/upload", upload.single("file"), uploadDataset);
router.get("/", listDatasets);
router.get("/:id", getDataset);
router.get("/:id/preview", previewDataset);

export default router;
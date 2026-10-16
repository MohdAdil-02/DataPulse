import express from "express";
import { getOutliers, getForecast, getNumericColumns } from "../controllers/insightsController.js";

const router = express.Router();

router.get("/:datasetId/columns", getNumericColumns);
router.get("/:datasetId/outliers", getOutliers);
router.get("/:datasetId/forecast", getForecast);

export default router;
import express from "express";
import { validateObjectId } from "../middleware/validateId.js";
import { getOutliers, getForecast, getNumericColumns } from "../controllers/insightsController.js";
import { getHealth, getCorrelations } from "../controllers/healthController.js";
import { getSummary } from "../controllers/autoInsightsController.js";

const router = express.Router();
router.param("datasetId", validateObjectId);

router.get("/:datasetId/columns", getNumericColumns);
router.get("/:datasetId/outliers", getOutliers);
router.get("/:datasetId/forecast", getForecast);
router.get("/:datasetId/health", getHealth);
router.get("/:datasetId/correlations", getCorrelations);
router.get("/:datasetId/summary", getSummary);

export default router;
import express from "express";
import { validateObjectId } from "../middleware/validateId.js";
import { askQuestion, getChatHistory } from "../controllers/chatController.js";

const router = express.Router();
router.param("datasetId", validateObjectId);

router.post("/ask", askQuestion);
router.get("/:datasetId/history", getChatHistory);

export default router;
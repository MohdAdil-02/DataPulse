import express from "express";
import { askQuestion, getChatHistory } from "../controllers/chatController.js";

const router = express.Router();

router.post("/ask", askQuestion);
router.get("/:datasetId/history", getChatHistory);

export default router;
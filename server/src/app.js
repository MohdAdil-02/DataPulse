import express from "express";
import cors from "cors";
import datasetRoutes from "./routes/datasetRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";

export function createApp() {
  const app = express();

  // CLIENT_ORIGIN can hold one or several addresses separated by commas; trailing slashes are ignored.
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""));
  app.use(cors({ origin: allowedOrigins.includes("*") ? "*" : allowedOrigins }));
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "chatbot-server" });
  });

  app.use("/api/datasets", datasetRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/insights", insightsRoutes);

  // Also answer without the /api prefix, so a frontend built with a base URL
  // that lacks "/api" still works.
  app.use("/datasets", datasetRoutes);
  app.use("/chat", chatRoutes);
  app.use("/insights", insightsRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use((err, req, res, next) => {
    console.error("[error]", err.message);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });

  return app;
}
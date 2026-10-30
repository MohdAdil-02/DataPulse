import express from "express";
import "express-async-errors"; // forwards errors from async handlers to the error handler; must come before the routes
import cors from "cors";
import datasetRoutes from "./routes/datasetRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";

export function createApp() {
  const app = express();

  // CLIENT_ORIGIN can hold one or several addresses separated by commas.
  // Quotes and trailing slashes are ignored.
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, ""));
  console.log("[cors] allowed origins:", allowedOrigins.join(", "));

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return cb(null, true);
        console.warn(`[cors] blocked origin: ${origin}`);
        cb(null, false);
      },
    })
  );
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "chatbot-server" });
  });

  app.use("/api/datasets", datasetRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/insights", insightsRoutes);

  // Also answer without the /api prefix, so a frontend built with a base URL that lacks "/api" still works.
  app.use("/datasets", datasetRoutes);
  app.use("/chat", chatRoutes);
  app.use("/insights", insightsRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Central error handler. Client mistakes (4xx) show their message; unexpected errors do not leak details.
  app.use((err, req, res, next) => {
    console.error("[error]", req.method, req.originalUrl, "-", err.message);
    if (res.headersSent) return next(err);
    if (err.name === "CastError") return res.status(400).json({ error: "Invalid ID." });
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File is too large (max 20 MB)." });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
}
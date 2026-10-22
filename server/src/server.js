import dns from "dns";
import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

// Only needed on networks whose DNS blocks MongoDB SRV lookups (set DNS_SERVERS locally).
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`[server] Listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[server] Failed to start:", err.message);
    process.exit(1);
  }
}

start();
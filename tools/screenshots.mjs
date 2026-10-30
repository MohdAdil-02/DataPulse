// Takes the README screenshots from the live site and saves them to docs/screenshots.
// Run from the project root:  node tools/screenshots.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SITE = process.env.SITE || "https://data-pulse-green.vercel.app";
const API = process.env.API || "https://datapulse-ieu1.onrender.com";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "screenshots");
const CSV = path.join(ROOT, "sample-data", "sample_sales.csv");
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("saved", name));

// The free backend sleeps when idle, so wake it up first.
async function wakeBackend() {
  console.log("Waking the backend (can take about a minute)...");
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch(`${API}/api/health`);
      if (res.ok) return console.log("Backend is awake.");
    } catch { /* still starting */ }
    await sleep(10000);
  }
  throw new Error("Backend did not wake up. Open the API health URL in a browser and check Render's logs.");
}

async function ask(page, question) {
  const before = await page.locator(".msg.assistant .bubble").count();
  await page.getByPlaceholder("Ask a question about your data…").fill(question);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.waitForFunction(
    (n) => document.querySelectorAll(".msg.assistant .bubble").length > n && !document.querySelector(".typing"),
    before,
    { timeout: 120000 }
  );
  await sleep(800); // let charts finish drawing
}

const openTab = (page, name) => page.locator(".tabs button", { hasText: name }).click();

await wakeBackend();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

try {
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.waitForSelector(".upload-box");
  await sleep(500);
  await shot(page, "upload.png");

  await page.setInputFiles('input[type="file"]', CSV);
  await page.getByRole("button", { name: /Upload and start chatting/ }).click();
  await page.waitForSelector(".shell", { timeout: 120000 });

  await ask(page, "What is the total sales by category?");
  await ask(page, "Now break that down by region");
  await shot(page, "chat.png");

  const pins = page.getByRole("button", { name: "Pin to dashboard" });
  while (await pins.count()) await pins.first().click();

  await openTab(page, "AI Summary");
  await page.waitForSelector(".findings", { timeout: 120000 });
  await sleep(500);
  await shot(page, "summary.png");

  await openTab(page, "Health");
  await page.waitForSelector(".health-hero", { timeout: 60000 });
  await sleep(1200);
  await shot(page, "health.png");

  await openTab(page, "Dashboard");
  await page.waitForSelector(".dash-grid", { timeout: 30000 });
  await sleep(1000);
  await shot(page, "dashboard.png");

  await page.locator('button[title="Toggle theme"]').click();
  await openTab(page, "Chat");
  await sleep(800);
  await shot(page, "light.png");

  console.log("\nDone. Screenshots are in docs/screenshots/");
} catch (err) {
  await page.screenshot({ path: path.join(OUT, "_error.png") }).catch(() => {});
  console.error("\nFailed:", err.message);
  console.error("A screenshot of where it stopped was saved as docs/screenshots/_error.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
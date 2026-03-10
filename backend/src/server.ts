// Load env from .env before anything else
import path from "path";
import fs from "fs";
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

import app from "./app";
import { pool } from "./db";

const PORT = parseInt(process.env.PORT || "3001", 10);

async function start() {
  // Test DB connection
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✓ Database connected");
  } catch (err) {
    console.error("✗ Database connection failed:", err);
    console.error("  Make sure PostgreSQL is running and DATABASE_URL is correct in .env");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✓ StockFlow backend running on http://localhost:${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
  });
}

start();

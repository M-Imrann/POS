/**
 * Seed script - creates the admin user and sample products.
 * Run: npx tsx src/seed.ts
 */
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

import { pool, queryOne } from "./db";
import { hashPassword } from "./auth";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminEmail = "admin@stockflow.com";
  const existing = await queryOne("SELECT id FROM users WHERE email = $1", [adminEmail]);

  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
  } else {
    const hash = await hashPassword("admin123");
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, company_name, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
      [adminEmail, hash, "Administrator", "StockFlow Store"]
    );
    const adminId = result.rows[0].id;
    console.log(`✓ Admin user created: ${adminEmail} / admin123`);

    // Seed sample products
    const products = [
      ["Cotton T-Shirt", "Clothes", "Men", 24.99, 8, 120, "8901234567891", 20, "M", "White"],
      ["Denim Jacket",   "Clothes", "Men", 59.99, 25, 15, "8901234567899", 5,  "L", "Indigo"],
      ["Running Shoes",  "Clothes", "Men", 89.99, 40, 3,  "8901234567894", 8,  "42","Blue"],
      ["Summer Dress",   "Clothes", "Women", 44.99, 18, 35,"8901234567900", 10, "S", "Floral"],
      ["Silk Blouse",    "Clothes", "Women", 54.99, 22, 20,"8901234567901", 8,  "M", "Cream"],
      ["Yoga Pants",     "Clothes", "Women", 34.99, 12, 50,"8901234567902", 15, "S", "Black"],
      ["Kids Hoodie",    "Clothes", "Kids",  19.99, 7,  60,"8901234567903", 15, "8Y","Red"],
      ["Kids Jeans",     "Clothes", "Kids",  22.99, 9,  45,"8901234567904", 10, "10Y","Blue"],
      ["Kids Sneakers",  "Clothes", "Kids",  29.99, 11, 30,"8901234567905", 8,  "32","White"],
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products (user_id, name, category, subcategory, price, cost, stock, barcode, low_stock_threshold, size, color)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [adminId, ...p]
      );
    }
    console.log(`✓ ${products.length} sample products created`);
  }

  await pool.end();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

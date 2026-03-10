import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { query, queryOne } from "../db";
import { authenticate, requireAdmin, AuthRequest } from "../middleware";

const router = Router();

// ─── File Upload Setup ────────────────────────────────────────────────────────
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ─── GET /api/products ────────────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Admins can optionally filter by user_id via query param
    const { userId } = req.query as { userId?: string };
    let rows;

    if (req.user!.role === "admin" && userId) {
      rows = await query(
        "SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
    } else if (req.user!.role === "admin" && req.query.all === "true") {
      rows = await query("SELECT * FROM products ORDER BY created_at DESC");
    } else {
      rows = await query(
        "SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user!.userId]
      );
    }

    res.json({ products: rows });
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/products ───────────────────────────────────────────────────────
router.post("/", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, subcategory, price, cost, stock, barcode,
            size, color, material, low_stock_threshold } = req.body as Record<string, string>;

    if (!name || !subcategory || !price) {
      res.status(400).json({ error: "name, subcategory, and price are required" });
      return;
    }

    let imageUrl: string | null = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const [product] = await query(
      `INSERT INTO products
        (user_id, name, category, subcategory, price, cost, stock, barcode,
         size, color, material, image_url, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user!.userId,
        name,
        category || "Clothes",
        subcategory,
        parseFloat(price),
        parseFloat(cost || "0"),
        parseInt(stock || "0", 10),
        barcode || null,
        size || null,
        color || null,
        material || null,
        imageUrl,
        parseInt(low_stock_threshold || "10", 10),
      ]
    );

    res.status(201).json({ product });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
router.put("/:id", authenticate, upload.single("image"), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, subcategory, price, cost, stock, barcode,
            size, color, material, low_stock_threshold } = req.body as Record<string, string>;

    // Ownership check (admins can edit any)
    const existing = await queryOne<{ id: string; user_id: string; image_url: string | null }>(
      "SELECT id, user_id, image_url FROM products WHERE id = $1",
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (req.user!.role !== "admin" && existing.user_id !== req.user!.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    let imageUrl = existing.image_url;
    if (req.file) {
      // Delete old image
      if (existing.image_url) {
        const oldPath = path.join(uploadsDir, path.basename(existing.image_url));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const [product] = await query(
      `UPDATE products SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        subcategory = COALESCE($3, subcategory),
        price = COALESCE($4, price),
        cost = COALESCE($5, cost),
        stock = COALESCE($6, stock),
        barcode = $7,
        size = $8,
        color = $9,
        material = $10,
        image_url = $11,
        low_stock_threshold = COALESCE($12, low_stock_threshold)
       WHERE id = $13
       RETURNING *`,
      [
        name || null,
        category || null,
        subcategory || null,
        price ? parseFloat(price) : null,
        cost ? parseFloat(cost) : null,
        stock !== undefined ? parseInt(stock, 10) : null,
        barcode !== undefined ? barcode || null : existing.image_url,
        size !== undefined ? size || null : undefined,
        color !== undefined ? color || null : undefined,
        material !== undefined ? material || null : undefined,
        imageUrl,
        low_stock_threshold ? parseInt(low_stock_threshold, 10) : null,
        id,
      ]
    );

    res.json({ product });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/products/:id/stock ────────────────────────────────────────────
router.patch("/:id/stock", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stock } = req.body as { stock?: number };

    if (stock === undefined || typeof stock !== "number") {
      res.status(400).json({ error: "stock (number) is required" });
      return;
    }

    const existing = await queryOne<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM products WHERE id = $1",
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (req.user!.role !== "admin" && existing.user_id !== req.user!.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [product] = await query(
      "UPDATE products SET stock = $1 WHERE id = $2 RETURNING *",
      [Math.max(0, stock), id]
    );

    res.json({ product });
  } catch (err) {
    console.error("Update stock error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await queryOne<{ id: string; user_id: string; image_url: string | null }>(
      "SELECT id, user_id, image_url FROM products WHERE id = $1",
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (req.user!.role !== "admin" && existing.user_id !== req.user!.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Delete associated image
    if (existing.image_url) {
      const imgPath = path.join(uploadsDir, path.basename(existing.image_url));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

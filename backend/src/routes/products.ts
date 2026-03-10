import { Router, Response } from "express";
import { query, queryOne } from "../db";
import { authenticate, AuthRequest } from "../middleware";

const router = Router();

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
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, subcategory, price, cost, stock, barcode,
            size, color, material, low_stock_threshold } = req.body as Record<string, string>;

    if (!name || !subcategory || !price) {
      res.status(400).json({ error: "name, subcategory, and price are required" });
      return;
    }

    const [product] = await query(
      `INSERT INTO products
        (user_id, name, category, subcategory, price, cost, stock, barcode,
         size, color, material, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, subcategory, price, cost, stock, barcode,
            size, color, material, low_stock_threshold } = req.body as Record<string, string>;

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
        low_stock_threshold = COALESCE($11, low_stock_threshold)
       WHERE id = $12
       RETURNING *`,
      [
        name || null,
        category || null,
        subcategory || null,
        price ? parseFloat(price) : null,
        cost ? parseFloat(cost) : null,
        stock !== undefined ? parseInt(stock, 10) : null,
        barcode !== undefined ? barcode || null : null,
        size !== undefined ? size || null : null,
        color !== undefined ? color || null : null,
        material !== undefined ? material || null : null,
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

    await query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

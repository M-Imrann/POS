import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, AuthRequest } from "../middleware";

const router = Router();

// ─── GET /api/stock-entries ───────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    let rows;

    if (req.user!.role === "admin" && userId) {
      rows = await query(
        "SELECT * FROM stock_entries WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
    } else if (req.user!.role === "admin" && req.query.all === "true") {
      rows = await query("SELECT * FROM stock_entries ORDER BY created_at DESC");
    } else {
      rows = await query(
        "SELECT * FROM stock_entries WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user!.userId]
      );
    }

    res.json({ stockEntries: rows });
  } catch (err) {
    console.error("Get stock entries error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/stock-entries ──────────────────────────────────────────────────
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, productName, type, quantity } = req.body as {
      productId?: string;
      productName?: string;
      type?: "in" | "out";
      quantity?: number;
    };

    if (!productId || !productName || !type || !quantity || quantity <= 0) {
      res.status(400).json({ error: "productId, productName, type (in/out), and quantity > 0 are required" });
      return;
    }
    if (type !== "in" && type !== "out") {
      res.status(400).json({ error: "type must be 'in' or 'out'" });
      return;
    }

    // Verify product belongs to user
    const product = await query(
      "SELECT id, stock FROM products WHERE id = $1 AND user_id = $2",
      [productId, req.user!.userId]
    );
    if (product.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Update stock
    const delta = type === "in" ? quantity : -quantity;
    await query(
      "UPDATE products SET stock = GREATEST(0, stock + $1) WHERE id = $2",
      [delta, productId]
    );

    // Record entry
    const [entry] = await query(
      `INSERT INTO stock_entries (user_id, product_id, product_name, type, quantity)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user!.userId, productId, productName, type, quantity]
    );

    res.status(201).json({ entry });
  } catch (err) {
    console.error("Create stock entry error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

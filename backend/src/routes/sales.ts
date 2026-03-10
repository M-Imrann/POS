import { Router, Response } from "express";
import { pool, query } from "../db";
import { authenticate, AuthRequest } from "../middleware";

const router = Router();

// ─── GET /api/sales ───────────────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };

    let salesRows;
    if (req.user!.role === "admin" && userId) {
      salesRows = await query(
        "SELECT * FROM sales WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
    } else if (req.user!.role === "admin" && req.query.all === "true") {
      salesRows = await query("SELECT * FROM sales ORDER BY created_at DESC");
    } else {
      salesRows = await query(
        "SELECT * FROM sales WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user!.userId]
      );
    }

    if (salesRows.length === 0) {
      res.json({ sales: [] });
      return;
    }

    const saleIds = salesRows.map((s: any) => s.id);
    const itemRows = await query(
      `SELECT * FROM sale_items WHERE sale_id = ANY($1::uuid[])`,
      [saleIds]
    );

    const itemsBySale = new Map<string, any[]>();
    for (const item of itemRows) {
      const list = itemsBySale.get((item as any).sale_id) || [];
      list.push(item);
      itemsBySale.set((item as any).sale_id, list);
    }

    const sales = salesRows.map((s: any) => ({
      ...s,
      items: itemsBySale.get(s.id) || [],
    }));

    res.json({ sales });
  } catch (err) {
    console.error("Get sales error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/sales ──────────────────────────────────────────────────────────
// Creates a sale, sale_items, updates stock, and records stock_entries atomically
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { cart, subtotal, tax, discount, total, paymentMode } = req.body as {
      cart: Array<{
        productId: string;
        productName: string;
        productPrice: number;
        quantity: number;
      }>;
      subtotal: number;
      tax: number;
      discount: number;
      total: number;
      paymentMode?: string;
    };

    if (!cart || cart.length === 0) {
      res.status(400).json({ error: "Cart cannot be empty" });
      return;
    }

    await client.query("BEGIN");

    const saleNumber = `S${Date.now().toString().slice(-8)}`;
    const { rows: saleRows } = await client.query(
      `INSERT INTO sales (user_id, sale_number, subtotal, tax, discount, total, payment_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user!.userId,
        saleNumber,
        subtotal,
        tax,
        discount ?? 0,
        total,
        paymentMode ?? "Cash",
      ]
    );
    const sale = saleRows[0];

    const saleItems = [];
    for (const item of cart) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, product_price, quantity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [sale.id, item.productId, item.productName, item.productPrice, item.quantity]
      );
      saleItems.push(itemRows[0]);

      // Decrement stock
      await client.query(
        `UPDATE products
         SET stock = GREATEST(0, stock - $1)
         WHERE id = $2 AND user_id = $3`,
        [item.quantity, item.productId, req.user!.userId]
      );

      // Record stock_entry
      await client.query(
        `INSERT INTO stock_entries (user_id, product_id, product_name, type, quantity)
         VALUES ($1, $2, $3, 'out', $4)`,
        [req.user!.userId, item.productId, item.productName, item.quantity]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({ sale: { ...sale, items: saleItems } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create sale error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;

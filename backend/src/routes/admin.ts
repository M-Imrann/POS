import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, requireAdmin, AuthRequest } from "../middleware";

const router = Router();

router.use(authenticate, requireAdmin);

// ─── GET /api/admin/data ──────────────────────────────────────────────────────
// Returns products, sales (with items), and stock entries
// Optionally filter by ?userId=<id>
router.get("/data", async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };

    let products, sales, stockEntries;

    if (userId) {
      [products, sales, stockEntries] = await Promise.all([
        query("SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
        query("SELECT * FROM sales WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
        query("SELECT * FROM stock_entries WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
      ]);
    } else {
      [products, sales, stockEntries] = await Promise.all([
        query("SELECT * FROM products ORDER BY created_at DESC"),
        query("SELECT * FROM sales ORDER BY created_at DESC"),
        query("SELECT * FROM stock_entries ORDER BY created_at DESC"),
      ]);
    }

    // Attach sale_items to each sale
    if (sales.length > 0) {
      const saleIds = sales.map((s: any) => s.id);
      const items = await query(
        "SELECT * FROM sale_items WHERE sale_id = ANY($1::uuid[])",
        [saleIds]
      );
      const byId = new Map<string, any[]>();
      for (const it of items) {
        const list = byId.get((it as any).sale_id) || [];
        list.push(it);
        byId.set((it as any).sale_id, list);
      }
      sales = sales.map((s: any) => ({ ...s, items: byId.get(s.id) || [] }));
    }

    res.json({ products, sales, stockEntries });
  } catch (err) {
    console.error("Admin data error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

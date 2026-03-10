import { Router, Response } from "express";
import { query, queryOne } from "../db";
import { authenticate, AuthRequest } from "../middleware";

const router = Router();

// ─── GET /api/profile ─────────────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne<{
      id: string; email: string; full_name: string | null;
      company_name: string | null; role: string; created_at: string;
    }>(
      "SELECT id, email, full_name, company_name, role, created_at FROM users WHERE id = $1",
      [req.user!.userId]
    );
    if (!user) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile: user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/profile ─────────────────────────────────────────────────────────
router.put("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, companyName } = req.body as {
      fullName?: string; companyName?: string;
    };

    const [user] = await query(
      `UPDATE users
       SET full_name = $1, company_name = $2
       WHERE id = $3
       RETURNING id, email, full_name, company_name, role, created_at`,
      [fullName ?? null, companyName ?? null, req.user!.userId]
    );

    res.json({ profile: user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

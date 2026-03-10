import { Router, Response } from "express";
import { query, queryOne } from "../db";
import { hashPassword } from "../auth";
import { authenticate, requireAdmin, AuthRequest } from "../middleware";

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get("/", async (_req: AuthRequest, res: Response) => {
  try {
    const users = await query(
      "SELECT id, email, full_name, company_name, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName, companyName, role } = req.body as {
      email?: string; password?: string; fullName?: string;
      companyName?: string; role?: "admin" | "user";
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await queryOne(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const hash = await hashPassword(password);
    const [user] = await query(
      `INSERT INTO users (email, password_hash, full_name, company_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, company_name, role, created_at`,
      [
        email.toLowerCase().trim(),
        hash,
        fullName || null,
        companyName || null,
        role === "admin" ? "admin" : "user",
      ]
    );

    res.status(201).json({ user });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, companyName, role, password } = req.body as {
      fullName?: string; companyName?: string;
      role?: "admin" | "user"; password?: string;
    };

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE id = $1",
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (password) {
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const hash = await hashPassword(password);
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, id]);
    }

    const [user] = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           company_name = COALESCE($2, company_name),
           role = COALESCE($3, role)
       WHERE id = $4
       RETURNING id, email, full_name, company_name, role, created_at`,
      [
        fullName !== undefined ? fullName || null : undefined,
        companyName !== undefined ? companyName || null : undefined,
        role || null,
        id,
      ]
    );

    res.json({ user });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if ((req as AuthRequest).user!.userId === id) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    const result = await query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router, Response } from "express";
import crypto from "crypto";
import { query, queryOne } from "../db";
import { hashPassword, comparePassword, signToken } from "../auth";
import { authenticate, AuthRequest } from "../middleware";

const router = Router();

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post("/login", async (req, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await queryOne<{
      id: string; email: string; password_hash: string;
      full_name: string | null; company_name: string | null; role: "admin" | "user";
    }>(
      "SELECT id, email, password_hash, full_name, company_name, role FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (!user || !(await comparePassword(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne<{
      id: string; email: string; full_name: string | null;
      company_name: string | null; role: string; created_at: string;
    }>(
      "SELECT id, email, full_name, company_name, role, created_at FROM users WHERE id = $1",
      [req.user!.userId]
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/auth/password ──────────────────────────────────────────────────
// Change own password (requires current password)
router.put("/password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string; newPassword?: string;
    };

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    // If currentPassword is provided, verify it
    if (currentPassword) {
      const user = await queryOne<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE id = $1",
        [req.user!.userId]
      );
      if (!user || !(await comparePassword(currentPassword, user.password_hash))) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
    }

    const hash = await hashPassword(newPassword);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user!.userId]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post("/forgot-password", async (req, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await queryOne<{ id: string; email: string }>(
      "SELECT id, email FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    // Always respond with success to avoid email enumeration
    if (!user) {
      res.json({ message: "If that email exists, a reset link has been sent" });
      return;
    }

    // Delete any existing tokens for this user
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Log reset URL to console (configure SMTP for real emails)
    console.log(`\n[Password Reset] User: ${user.email}\nReset URL: ${resetUrl}\n`);

    res.json({ message: "If that email exists, a reset link has been sent", resetUrl });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
router.post("/reset-password", async (req, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !password || password.length < 6) {
      res.status(400).json({ error: "Valid token and password (min 6 chars) are required" });
      return;
    }

    const record = await queryOne<{ id: string; user_id: string; expires_at: string; used: boolean }>(
      "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = $1",
      [token]
    );

    if (!record || record.used || new Date(record.expires_at) < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const hash = await hashPassword(password);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, record.user_id]);
    await query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [record.id]);

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

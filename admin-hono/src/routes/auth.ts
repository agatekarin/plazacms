import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db";
import { generateToken, authMiddleware } from "../lib/auth";

const auth = new Hono<{ Bindings: Env }>();

// Login schema
const loginSchema = z.object({
  email: z.string().min(1), // Allow any string for email (including local domains)
  password: z.string().min(1),
});

// POST /api/auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    const sql = getDb(c);

    // Find user by email using template literals (Neon compatible)
    const users = await sql`
      SELECT id, email, name, password_hash, role
      FROM public.users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (users.length === 0) {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    // Generate JWT token
    const token = await generateToken(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      c.env.JWT_SECRET
    );

    // Return success response
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ success: false, error: "Login failed" }, 500);
  }
});

// GET /api/auth/me
auth.get("/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    return c.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({ success: false, error: "Failed to get user info" }, 500);
  }
});

export default auth;

import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { loginSchema } from "../types";

const auth = new Hono<{ Bindings: Env }>();

// POST /auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    const { getDb } = await import("../lib/db");
    const { verifyPassword, generateToken } = await import("../lib/auth");

    const sql = getDb(c as any);

    // Direct query to find user
    const users = await sql`
      SELECT id, email, name, role, password_hash
      FROM public.users
      WHERE email = ${email}
    `;

    if (!users[0]) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const user = users[0];

    // Check if user has admin role
    if (user.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    // Verify password
    if (!user.password_hash) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // Generate JWT token
    const token = await generateToken(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      c.env.JWT_SECRET
    );

    // Set HTTP-only cookie
    setCookie(c, "auth-token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

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
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// POST /auth/logout
auth.post("/logout", (c) => {
  setCookie(c, "auth-token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
  });

  return c.json({ success: true, message: "Logged out successfully" });
});

// GET /auth/me
auth.get("/me", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const token = authHeader.substring(7);
    const { verifyToken } = await import("../lib/auth");

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: "Invalid token" }, 401);
    }

    const user = payload as any;
    return c.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// POST /auth/create-admin (temporary endpoint for setup)
auth.post("/create-admin", async (c) => {
  try {
    const { hashPassword } = await import("../lib/auth");
    const { getDb } = await import("../lib/db");
    const sql = getDb(c as any);

    const hashedPassword = await hashPassword("password123");

    const result = await sql`
      INSERT INTO public.users (email, name, password_hash, role)
      VALUES ('admin@plazacms.com', 'Admin User', ${hashedPassword}, 'admin')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, email, name, role
    `;

    return c.json({
      success: true,
      message: "Admin user created/updated successfully",
      data: { user: result[0] },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return c.json({ error: "Failed to create admin user" }, 500);
  }
});

export default auth;

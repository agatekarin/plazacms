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

// POST /api/auth/login (deprecated) — removed in favor of Auth.js

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

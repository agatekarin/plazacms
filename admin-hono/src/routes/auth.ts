import { Hono } from "hono";
import { authMiddleware } from "../lib/auth";

const auth = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/auth/me - Get current user info from AuthJS session
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

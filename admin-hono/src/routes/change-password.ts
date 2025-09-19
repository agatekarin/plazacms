import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "../lib/db";
import { authMiddleware } from "../lib/auth";
import bcrypt from "bcryptjs";

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// CORS middleware
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

// POST /api/account/change-password - Change user password
app.post("/", authMiddleware as any, async (c) => {
  try {
    const user = (c as any).get("user");
    if (!user?.email) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { currentPassword, newPassword } = await c.req
      .json()
      .catch(() => ({}));

    // Validate input
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return c.json({ error: "Invalid payload" }, 400);
    }

    if (newPassword.length < 8) {
      return c.json(
        { error: "New password must be at least 8 characters" },
        400
      );
    }

    // Get database connection
    const sql = getDb(c as any);

    // Fetch current user with password_hash
    const [currentUser] = await sql`
      SELECT id, email, password_hash 
      FROM public.users 
      WHERE email = ${user.email} 
      LIMIT 1
    `;

    if (!currentUser || typeof currentUser.password_hash !== "string") {
      return c.json({ error: "User not found or password not set" }, 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      currentUser.password_hash
    );
    if (!isCurrentPasswordValid) {
      return c.json({ error: "Current password is incorrect" }, 400);
    }

    // Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      currentUser.password_hash
    );
    if (isSamePassword) {
      return c.json({ error: "New password must be different" }, 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await sql`
      UPDATE public.users 
      SET password_hash = ${newPasswordHash}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${currentUser.id}
    `;

    return c.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("[change-password] Error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;

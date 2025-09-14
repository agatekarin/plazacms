import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

// Import routes
import authRoutes from "./routes/auth";
import attributesRoutes from "./routes/attributes";

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", secureHeaders());

// CORS configuration
app.use(
  "*",
  cors({
    origin: ["http://localhost:3001", "https://admin.plazacms.com"], // Add your admin frontend URLs
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "PlazaCMS Admin API with Hono + Hyperdrive",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to test direct database query
app.get("/debug/user", async (c) => {
  try {
    const { getDb } = await import("./lib/db");
    const sql = getDb(c as any);

    // Direct query to check if user exists
    const users = await sql`
      SELECT id, email, name, role, password_hash
      FROM public.users
      WHERE email = 'admin@local'
    `;

    return c.json({
      success: true,
      data: {
        userCount: users.length,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          hasPassword: !!u.password_hash,
        })),
      },
    });
  } catch (error) {
    console.error("Debug user error:", error);
    return c.json(
      {
        error: "User lookup failed",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/admin/attributes", attributesRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Global error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Export for Cloudflare Workers
export default app;

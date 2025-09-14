import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

// Import routes
import authRoutes from "./routes/auth";
import attributesRoutes from "./routes/attributes";

// Create main app
const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

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
    endpoints: {
      auth: "/api/auth",
      attributes: "/api/admin/attributes",
    },
  });
});

// Mount routes
app.route("/api/auth", authRoutes);
app.route("/api/admin/attributes", attributesRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Endpoint not found",
      message: "The requested endpoint does not exist",
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      success: false,
      error: "Internal server error",
      message: err.message,
    },
    500
  );
});

export default app;

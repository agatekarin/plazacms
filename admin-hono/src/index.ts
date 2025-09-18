import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { authHandler, initAuthConfig } from "@hono/auth-js";
import Credentials from "@auth/core/providers/credentials";
import { rateLimiter } from "hono-rate-limiter";
import { WorkersKVStore } from "@hono-rate-limiter/cloudflare";
// Types provided globally by @cloudflare/workers-types
type EnvWithRateLimit = Env & { RATE_LIMIT_KV: KVNamespace };

// Import routes
import authRoutes from "./routes/auth";
import { getDb } from "./lib/db";
import { generateToken } from "./lib/auth";
import attributesRoutes from "./routes/attributes";
import productsRoutes from "./routes/products";
import categoriesRoutes from "./routes/categories";
import taxClassesRoutes from "./routes/tax-classes";
import productBulkRoutes from "./routes/product-bulk";
import productVariantsRoutes from "./routes/product-variants";
import productMediaRoutes from "./routes/product-media";
import productImportRoutes from "./routes/product-import";
import productExportRoutes from "./routes/product-export";
import mediaRoutes from "./routes/media";
import mediaUploadRoutes from "./routes/media-upload";
import mediaFoldersRoutes from "./routes/media-folders";
import mediaBulkRoutes from "./routes/media-bulk";
import settingsGeneralRoutes from "./routes/settings-general";
import changePasswordRoutes from "./routes/change-password";
import usersRoutes from "./routes/users";
import ordersRoutes from "./routes/orders";
import paymentsRoutes from "./routes/payments";
import transactionsRoutes from "./routes/transactions";
import locationsRoutes from "./routes/locations";
import shippingZonesRoutes from "./routes/shipping-zones";
import shippingMethodsRoutes from "./routes/shipping-methods";
import shippingGatewaysRoutes from "./routes/shipping-gateways";
import settingsShippingRoutes from "./routes/settings-shipping";
import shippingCalculatorRoutes from "./routes/shipping-calculator";
import shippingSummaryRoutes from "./routes/shipping-summary";
import variantsRoutes from "./routes/variants";
import customersRoutes from "./routes/customers";
import reviewsRoutes from "./routes/reviews";
import reviewImagesRoutes from "./routes/review-images";
import reviewImportExportRoutes from "./routes/review-import-export";
import customerReviewsRoutes from "./routes/customer-reviews";
import reviewEmailNotificationsRoutes from "./routes/review-email-notifications";

// Create main app
const app = new Hono<{
  Bindings: EnvWithRateLimit;
  Variables: { user: any };
}>();

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
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Rate limiting
// 1) Legacy /api/auth/login limiter removed (we use Auth.js /api/authjs/signin)

// Helper: wrap rate limiter to fail-open on KV errors
const safeRateLimiter = (
  config: Parameters<
    typeof rateLimiter<{ Bindings: EnvWithRateLimit; Variables: { user: any } }>
  >[0]
) => {
  const mw = rateLimiter<{
    Bindings: EnvWithRateLimit;
    Variables: { user: any };
  }>(config);
  return async (c: any, next: any) => {
    try {
      return await (mw as any)(c, next);
    } catch (e: any) {
      console.warn("[rateLimiter] KV error - fail-open:", e?.message || e);
      return next();
    }
  };
};

const isRateLimitDisabled = (c: any): boolean => {
  try {
    const v = (c as any).env?.DISABLE_RATE_LIMIT as string | undefined;
    return !!v && /^(1|true|yes)$/i.test(v);
  } catch {
    return false;
  }
};

// 1b) Protect Auth.js credential sign-in POST as well
app.use("/api/authjs/signin", (c, next) => {
  if (c.req.method !== "POST") return next();
  if (isRateLimitDisabled(c)) return next();
  return safeRateLimiter({
    windowMs: 180_000,
    limit: 10,
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "unknown",
    store: new WorkersKVStore({
      namespace: c.env.RATE_LIMIT_KV,
      prefix: "rl:auth:",
    }),
  })(c, next);
});

// 1c) Protect Auth.js credentials callback (actual credentials POST target)
app.use("/api/authjs/callback/credentials", (c, next) => {
  if (c.req.method !== "POST") return next();
  if (isRateLimitDisabled(c)) return next();
  return safeRateLimiter({
    windowMs: 180_000,
    limit: 10,
    standardHeaders: "draft-6",
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "unknown",
    store: new WorkersKVStore({
      namespace: c.env.RATE_LIMIT_KV,
      prefix: "rl:auth:",
    }),
  })(c, next);
});

// 2) General API rate limit (prefer per-user when available, fallback to IP)
//    Scope only to business APIs; exclude Auth.js endpoints (/api/authjs/*)
for (const prefix of ["/api/admin/*", "/api/auth/*", "/api/account/*"]) {
  app.use(prefix, (c, next) =>
    isRateLimitDisabled(c) || c.req.path.startsWith("/api/admin/locations")
      ? next()
      : safeRateLimiter({
          windowMs: 180_000,
          limit: 2000,
          standardHeaders: "draft-6",
          keyGenerator: (c) => {
            try {
              const auth =
                c.req.header("authorization") || c.req.header("Authorization");
              if (auth?.startsWith("Bearer ")) {
                const token = auth.slice(7);
                const parts = token.split(".");
                if (parts.length === 3) {
                  const payloadStr = atob(
                    parts[1].replace(/-/g, "+").replace(/_/g, "/")
                  );
                  const payload = JSON.parse(payloadStr);
                  if (typeof payload?.sub === "string")
                    return `user:${payload.sub}`;
                }
              }
            } catch {}
            return c.req.header("cf-connecting-ip") ?? "unknown";
          },
          store: new WorkersKVStore({
            namespace: c.env.RATE_LIMIT_KV,
            prefix: "rl:api:",
          }),
        })(c, next)
  );
}

// 3) Heavy endpoints – stricter limits per user (fallback IP)
for (const p of [
  "/api/admin/products/import",
  "/api/admin/products/export",
  "/api/admin/media/upload",
  "/api/admin/media/bulk",
]) {
  app.use(p, (c, next) =>
    isRateLimitDisabled(c)
      ? next()
      : safeRateLimiter({
          windowMs: 180_000,
          limit: 120,
          standardHeaders: "draft-6",
          keyGenerator: (c) => {
            try {
              const auth =
                c.req.header("authorization") || c.req.header("Authorization");
              if (auth?.startsWith("Bearer ")) {
                const token = auth.slice(7);
                const parts = token.split(".");
                if (parts.length === 3) {
                  const payloadStr = atob(
                    parts[1].replace(/-/g, "+").replace(/_/g, "/")
                  );
                  const payload = JSON.parse(payloadStr);
                  if (typeof payload?.sub === "string")
                    return `user:${payload.sub}`;
                }
              }
            } catch {}
            return c.req.header("cf-connecting-ip") ?? "unknown";
          },
          store: new WorkersKVStore({
            namespace: c.env.RATE_LIMIT_KV,
            prefix: "rl:api:heavy:",
          }),
        })(c, next)
  );
}

// Auth.js configuration (Hono middleware)
app.use(
  "*",
  initAuthConfig((c) => ({
    secret: c.env.AUTH_SECRET,
    trustHost: true,
    providers: [
      Credentials({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (credentials) => {
          const email =
            typeof (credentials as any)?.email === "string"
              ? ((credentials as any).email as string)
              : undefined;
          const password =
            typeof (credentials as any)?.password === "string"
              ? ((credentials as any).password as string)
              : undefined;
          if (!email || !password) return null;

          const sql = getDb(c as any);
          const users = await sql`
            SELECT id, email, name, image, password_hash, role
            FROM public.users
            WHERE email = ${email}
            LIMIT 1
          `;
          if (users.length === 0) return null;
          const user = users[0];

          const bcrypt = await import("bcryptjs");
          const isValidPassword = await bcrypt.compare(
            password,
            user.password_hash
          );
          if (!isValidPassword) return null;

          // Generate our API JWT and attach to user for session callbacks
          const token = await generateToken(
            {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            (c as any).env.JWT_SECRET
          );

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image ?? null,
            accessToken: token,
          } as any;
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }: any) {
        if (user) {
          token.role = (user as any).role;
          token.id = (user as any).id;
          if ((user as any).image !== undefined) {
            (token as any).image = (user as any).image;
          }
          if ((user as any).accessToken) {
            (token as any).accessToken = (user as any).accessToken as string;
          }
        }
        return token;
      },
      async session({ session, token }: any) {
        (session as any).user = (session as any).user || {};
        (session as any).user.role = token.role as string | undefined;
        (session as any).user.id = token.id as string | undefined;
        (session as any).user.image = (token as any).image as
          | string
          | null
          | undefined;
        (session as any).accessToken = (token as any).accessToken as
          | string
          | undefined;
        return session;
      },
    },
  }))
);

// Mount Auth.js handler under a distinct base path to avoid conflicts with existing /api/auth routes
app.use("/api/authjs/*", authHandler());

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
app.route("/api/admin/products", productsRoutes);
app.route("/api/admin/products/bulk", productBulkRoutes);
app.route("/api/admin/products/import", productImportRoutes);
app.route("/api/admin/products/export", productExportRoutes);
app.route("/api/admin/products", productVariantsRoutes);
app.route("/api/admin/products", productMediaRoutes);
app.route("/api/admin/categories", categoriesRoutes);
app.route("/api/admin/tax-classes", taxClassesRoutes);
// Mount specific media routes FIRST (before generic /media route)
app.route("/api/admin/media/upload", mediaUploadRoutes);
app.route("/api/admin/media/folders", mediaFoldersRoutes);
app.route("/api/admin/media/bulk", mediaBulkRoutes);
// Generic media route LAST (catches remaining paths)
app.route("/api/admin/media", mediaRoutes);
app.route("/api/admin/settings/general", settingsGeneralRoutes);
app.route("/api/admin/users", usersRoutes);
app.route("/api/admin/customers", customersRoutes);
app.route("/api/admin/orders", ordersRoutes);
app.route("/api/admin/payments", paymentsRoutes);
app.route("/api/admin/transactions", transactionsRoutes);
app.route("/api/admin/locations", locationsRoutes);
app.route("/api/admin/shipping/zones", shippingZonesRoutes);
app.route("/api/admin/shipping/methods", shippingMethodsRoutes);
app.route("/api/admin/shipping/gateways", shippingGatewaysRoutes);
app.route("/api/admin/settings/shipping", settingsShippingRoutes);
app.route("/api/admin/shipping/calculator", shippingCalculatorRoutes);
app.route("/api/admin/shipping/summary", shippingSummaryRoutes);
app.route("/api/admin/variants", variantsRoutes);
app.route("/api/admin/reviews", reviewsRoutes);
app.route("/api/admin/reviews", reviewImagesRoutes);
app.route("/api/admin/reviews", reviewImportExportRoutes);
app.route("/api/admin/reviews", reviewEmailNotificationsRoutes);
app.route("/api/reviews", customerReviewsRoutes);
app.route("/api/account/change-password", changePasswordRoutes);

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

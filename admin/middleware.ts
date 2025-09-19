import { NextResponse, type NextRequest } from "next/server";

// Simple in-memory rate limiter (per instance) for sensitive endpoints
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute
const rateStore = new Map<string, number[]>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const arr = rateStore.get(key) || [];
  const recent = arr.filter((t) => t > windowStart);
  recent.push(now);
  rateStore.set(key, recent);
  return recent.length <= RATE_LIMIT_MAX;
}

function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
  );
  // Minimal CSP (adjust if you add external assets)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  // Avoid indexing
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit change-password API
  if (pathname.startsWith("/api/account/change-password")) {
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      (req as any).ip ||
      "unknown";
    const key = `cpw:${ip}`;
    if (!rateLimit(key)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests, please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        }
      );
    }
  }

  // Rate limit NextAuth endpoints (e.g., sign-in attempts)
  if (pathname.startsWith("/api/auth/")) {
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      (req as any).ip ||
      "unknown";
    const key = `auth:${ip}`;
    if (!rateLimit(key)) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many auth requests, please try again later.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        }
      );
    }
  }

  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
}

// Protect everything except these paths
export const config = {
  matcher: [
    "/((?!api/auth|api/authjs|_next|favicon.ico|signin|public|assets).*)",
    // Also run on this sensitive API for rate limiting
    "/api/account/change-password",
    // Run on NextAuth endpoints for rate limiting
    "/api/auth/:path*",
    // Run on Auth.js Hono endpoints for rate limiting
    "/api/authjs/:path*",
  ],
};

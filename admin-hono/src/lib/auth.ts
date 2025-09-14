import { Context } from "hono";
import { sign, verify } from "hono/jwt";

// Extend Hono context with user variable
type Variables = {
  user: User;
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface CustomJWTPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
  [key: string]: any; // Index signature for Hono compatibility
}

// Generate JWT token
export async function generateToken(
  user: User,
  secret: string
): Promise<string> {
  const payload: CustomJWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };

  return await sign(payload, secret);
}

// Verify JWT token
export async function verifyToken(
  token: string,
  secret: string
): Promise<CustomJWTPayload | null> {
  try {
    const payload = await verify(token, secret);
    return payload as CustomJWTPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

// Auth middleware
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: () => Promise<void>
) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { success: false, error: "Missing or invalid authorization header" },
      401
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  // Add user info to context
  c.set("user", {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  });

  await next();
}

// Admin-only middleware
export async function adminMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: () => Promise<void>
): Promise<any> {
  // First check auth
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { success: false, error: "Missing or invalid authorization header" },
      401
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  // Set user in context
  c.set("user", {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  });

  // Check admin role
  if (payload.role !== "admin") {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }

  await next();
}

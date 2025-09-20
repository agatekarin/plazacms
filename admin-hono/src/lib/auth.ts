import { Context } from "hono";

// AuthJS-based user interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Helper to extract session from AuthJS Bearer token
async function verifyAuthJSSession(c: Context): Promise<User | null> {
  try {
    // Check Authorization header for Bearer token (this is the accessToken from AuthJS)
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);

    // Verify the JWT token (our custom accessToken from AuthJS callback)
    const { verify } = await import("hono/jwt");
    try {
      const payload = (await verify(token, c.env.JWT_SECRET)) as any;
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return null;
    }
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

// AuthJS-based auth middleware
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: User } }>,
  next: () => Promise<void>
) {
  const user = await verifyAuthJSSession(c);

  if (!user) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  // Add user info to context
  c.set("user", user);
  await next();
}

// AuthJS-based admin middleware
export async function adminMiddleware(
  c: Context<{ Bindings: Env; Variables: { user: User } }>,
  next: () => Promise<void>
): Promise<any> {
  const user = await verifyAuthJSSession(c);

  if (!user) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  // Set user in context
  c.set("user", user);

  // Check admin role
  if (user.role !== "admin") {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }

  await next();
}

// Generate JWT token for AuthJS accessToken integration
export async function generateToken(
  user: User,
  secret: string
): Promise<string> {
  const { sign } = await import("hono/jwt");
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };

  return await sign(payload, secret);
}

import { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { db, DatabaseContext, getDb } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContext extends Context {
  get: {
    user?: User;
  };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password using bcrypt
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export async function generateToken(
  user: User,
  secret: string
): Promise<string> {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return sign(payload, secret);
}

/**
 * Verify JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<User | null> {
  try {
    const payload = (await verify(token, secret)) as any;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Get user by email from database
 */
export async function getUserByEmail(
  c: DatabaseContext,
  email: string
): Promise<User | null> {
  try {
    const sql = getDb(c);
    const users = await sql`
      SELECT id, email, name, role, created_at, updated_at
      FROM public.users
      WHERE email = ${email}
    `;
    return (users[0] as User) || null;
  } catch {
    return null;
  }
}

/**
 * Get user by ID from database
 */
export async function getUserById(
  c: DatabaseContext,
  id: string
): Promise<User | null> {
  try {
    const sql = getDb(c);
    const users = await sql`
      SELECT id, email, name, role, created_at, updated_at
      FROM public.users
      WHERE id = ${id}
    `;
    return (users[0] as User) || null;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  const token =
    getCookie(c, "auth-token") ||
    c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await verifyToken(token, c.env.JWT_SECRET);
  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Verify user still exists in database
  const dbUser = await getUserById(c as DatabaseContext, user.id);
  if (!dbUser) {
    return c.json({ error: "User not found" }, 401);
  }

  // Add user to context
  c.set("user", dbUser);
  await next();
}

/**
 * Admin role middleware
 */
export async function adminMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  const user = c.get("user") as User;

  if (!user || user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
}

/**
 * Login function
 */
export async function login(
  c: DatabaseContext,
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await getUserByEmail(c, email);
  if (!user) {
    return null;
  }

  // Get password hash from database
  const sql = getDb(c);
  const userWithPassword = await sql`
    SELECT id, email, name, role, password_hash
    FROM public.users
    WHERE email = ${email}
  `;

  if (!userWithPassword[0]) {
    return null;
  }

  const isValidPassword = await verifyPassword(
    password,
    userWithPassword[0].password_hash
  );
  if (!isValidPassword) {
    return null;
  }

  const token = await generateToken(user, c.env.JWT_SECRET);
  return { user, token };
}

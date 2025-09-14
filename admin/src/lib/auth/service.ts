import { pool } from "../db";
import {
  User,
  Session,
  LoginCredentials,
  AuthResponse,
  UserRole,
} from "./types";
// Using Web Crypto API for Edge Runtime compatibility
import { cookies } from "next/headers";

// Web Crypto API password utilities for Edge Runtime
class PasswordUtils {
  static async hash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hash(password);
    return passwordHash === hash;
  }
}

export class AuthService {
  private static readonly SESSION_COOKIE_NAME = "plaza_session";
  private static readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Login user
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Get user by email
      const { rows } = await pool.query(
        "SELECT id, name, email, role, image, password_hash, created_at, updated_at FROM public.users WHERE email = $1 LIMIT 1",
        [credentials.email]
      );
      const user = rows[0];

      if (!user) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Verify password
      const isValidPassword = await PasswordUtils.compare(
        credentials.password,
        user.password_hash
      );
      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Create session
      const session = await this.createSession(user.id);
      if (!session) {
        return {
          success: false,
          error: "Failed to create session",
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          image: user.image,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        session,
        message: "Login successful",
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Login failed",
      };
    }
  }

  // Logout user
  static async logout(sessionToken?: string): Promise<AuthResponse> {
    try {
      let token = sessionToken;

      // If no session token provided, get from cookies
      if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get(this.SESSION_COOKIE_NAME)?.value;
      }

      if (token) {
        // Delete session from database
        await pool.query(
          "DELETE FROM public.sessions WHERE session_token = $1",
          [token]
        );
      }

      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        error: "Logout failed",
      };
    }
  }

  // Get current user from session
  static async getCurrentUser(sessionToken?: string): Promise<User | null> {
    try {
      let token = sessionToken;

      // If no session token provided, get from cookies
      if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get(this.SESSION_COOKIE_NAME)?.value;
      }

      if (!token) {
        return null;
      }

      const { rows } = await pool.query(
        `SELECT
          s.id as session_id,
          s.user_id,
          s.session_token,
          s.expires,
          u.id,
          u.email,
          u.name,
          u.role,
          u.image,
          u.email_verified,
          u.created_at,
          u.updated_at
        FROM public.sessions s
        JOIN public.users u ON s.user_id = u.id
        WHERE s.session_token = $1 AND s.expires > NOW() LIMIT 1`,
        [token]
      );

      const session = rows[0];
      if (!session) {
        return null;
      }

      return {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role as UserRole,
        image: session.image,
        email_verified: session.email_verified,
        created_at: session.created_at,
        updated_at: session.updated_at,
      };
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  // Create new session
  private static async createSession(userId: string): Promise<Session | null> {
    try {
      const sessionToken = this.generateSessionToken();
      const expires = new Date(Date.now() + this.SESSION_DURATION);

      const { rows } = await pool.query(
        "INSERT INTO public.sessions (user_id, session_token, expires) VALUES ($1, $2, $3) RETURNING *",
        [userId, sessionToken, expires]
      );
      const session = rows[0];

      if (!session) {
        return null;
      }

      return {
        id: session.id,
        user_id: session.user_id,
        session_token: session.session_token,
        expires: session.expires,
        created_at: session.created_at,
        updated_at: session.updated_at,
      };
    } catch (error) {
      console.error("Create session error:", error);
      return null;
    }
  }

  // Generate random session token
  private static generateSessionToken(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    // Fallback
    return (
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    );
  }

  // Check if user has required role
  static hasRole(user: User, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      admin: 4,
      vendor: 3,
      customer: 2,
      guest: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  // Get session token from cookies
  static async getSessionToken(): Promise<string | undefined> {
    try {
      const cookieStore = await cookies();
      return cookieStore.get(this.SESSION_COOKIE_NAME)?.value;
    } catch {
      return undefined;
    }
  }

  // Set session token in cookies (for API routes)
  static setSessionCookie(sessionToken: string): string {
    const expires = new Date(Date.now() + this.SESSION_DURATION);
    return `${
      this.SESSION_COOKIE_NAME
    }=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`;
  }
}

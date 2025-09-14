"use client";

import { useState, useEffect, useCallback } from "react";
import { User, AuthContext, LoginCredentials } from "./types";

export function useAuth(): AuthContext & {
  login: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check current auth status
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      // Redirect to signin
      window.location.href = "/signin";
    }
  }, []);

  // Check if user has specific role
  const hasRole = useCallback(
    (requiredRole: string) => {
      if (!user) return false;

      const roleHierarchy: Record<string, number> = {
        admin: 4,
        vendor: 3,
        customer: 2,
        guest: 1,
      };

      return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    },
    [user]
  );

  // Initialize auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    session: null, // We don't expose session details to frontend
    isAuthenticated: !!user,
    isAdmin: hasRole("admin"),
    hasRole,
    login,
    logout,
    loading,
    refresh: checkAuth,
  };
}

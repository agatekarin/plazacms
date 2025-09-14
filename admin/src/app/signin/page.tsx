"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorParam = params.get("error");

  useEffect(() => {
    if (errorParam === "access_denied") {
      setErrorMessage("Access denied. You do not have the required role.");
    } else if (errorParam) {
      setErrorMessage("An unknown error occurred. Please try again.");
    }
  }, [errorParam]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.user) {
        // Login successful, redirect to admin page
        router.push(result.user.role === "admin" ? "/admin" : "/"); // Redirect based on role
      } else {
        setErrorMessage(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Login submission error:", error);
      setErrorMessage("An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Admin Sign In</h1>
      {(errorMessage || errorParam) && (
        <p style={{ color: "crimson", marginBottom: 12 }}>
          {errorMessage || "Invalid credentials or not authorized"}
        </p>
      )}
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@local"
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 10 }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
      <p style={{ marginTop: 12, color: "#666" }}>
        Use: admin@local / Admin123!
      </p>
    </main>
  );
}

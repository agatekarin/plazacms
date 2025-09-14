"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithAPI, setAuthToken } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginWithAPI(email, password);

      if (result && result.success) {
        // Save token and redirect to admin
        setAuthToken(result.data.token);
        router.push("/admin");
      } else {
        setError("Invalid credentials or not authorized");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Admin Sign In</h1>
      {error && <p style={{ color: "crimson", marginBottom: 12 }}>{error}</p>}
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
        Use: admin@local / Amin1996
      </p>
    </main>
  );
}

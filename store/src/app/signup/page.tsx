"use client";

import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Failed to register");
      }
      // Auto login
      const login = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (login?.error) throw new Error("Auto login failed");
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[420px] px-3 md:px-6 py-6 grid gap-3">
        <h1 className="text-base md:text-xl font-semibold text-gray-900">
          Create account
        </h1>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <input
          className="h-10 px-3 rounded-lg border"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="h-10 px-3 rounded-lg border"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="h-10 px-3 rounded-lg border"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="h-10 px-4 rounded-lg bg-gray-900 text-white disabled:opacity-60"
          disabled={loading}
          onClick={onRegister}
        >
          {loading ? "Loading..." : "Create account"}
        </button>
        <a href="/signin" className="text-sm text-gray-600">
          Have an account? Sign in
        </a>
      </main>
      <BottomBar />
    </div>
  );
}

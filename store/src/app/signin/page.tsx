"use client";

import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[420px] px-3 md:px-6 py-6 grid gap-3">
        <h1 className="text-base md:text-xl font-semibold text-gray-900">
          Sign in
        </h1>
        {error && <div className="text-sm text-red-600">{error}</div>}
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
          className="h-10 px-4 rounded-lg bg-gray-900 text-white"
          onClick={async () => {
            setError(null);
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false,
            });
            if (res?.error) setError("Invalid credentials");
            else window.location.href = "/";
          }}
        >
          Sign in
        </button>
        <a href="/signup" className="text-sm text-gray-600">
          Create account
        </a>
      </main>
      <BottomBar />
    </div>
  );
}

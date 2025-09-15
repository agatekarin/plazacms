"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function SignInPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const error = params.get("error");

  // If already authenticated, redirect to /admin
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn("credentials", {
        redirect: true,
        callbackUrl: "/admin",
        email,
        password,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-blue-600/90 ring-8 ring-blue-100 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sign in to your PlazaCMS admin</p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-sm dark:bg-slate-900/60 dark:border-slate-800">
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Incorrect email or password, or your account is not authorized.
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Your password"
                    className="block w-full rounded-lg border border-slate-300 pl-9 pr-10 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                {/* Removed Forgot password link for admin-only app */}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By signing in, you agree to our
          {" "}
          <Link href="/terms" className="underline hover:text-slate-700">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}

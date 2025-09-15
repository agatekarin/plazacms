"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function SignOutPage() {
  useEffect(() => {
    // Trigger sign out on mount and redirect back to /signin
    signOut({ redirect: true, callbackUrl: "/signin" });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-blue-600/90 ring-8 ring-blue-100 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <LogOut className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Signing you out...</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Please wait while we securely end your session.
        </p>
        <div className="mt-8">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}

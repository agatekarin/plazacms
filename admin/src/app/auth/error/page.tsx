"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const errorMap: Record<string, string> = {
  CredentialsSignin: "Incorrect email or password.",
  AccessDenied: "You don’t have access to this resource.",
  OAuthSignin: "Failed to sign in with the provider.",
  OAuthCallback: "Authentication callback failed.",
  Configuration: "Auth configuration error.",
  Verification: "Verification failed.",
  Default: "Authentication error. Please try again.",
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const code = params.get("error") ?? "Default";
  const message = errorMap[code] ?? errorMap.Default;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-red-600/90 ring-8 ring-red-100 flex items-center justify-center shadow-lg shadow-red-600/20">
          <AlertTriangle className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Authentication error</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {message}
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

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
  // Serahkan ke halaman error Auth.js bawaan (redirect ke /api/authjs/error)
  if (typeof window !== "undefined") {
    window.location.replace("/api/authjs/error");
  }
  return null;
}

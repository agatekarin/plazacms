"use client";

import { useEffect, useState } from "react";
import { useSession } from "@hono/auth-js/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function SignInPage() {
  // Redirect ke Auth.js builtin page saja
  if (typeof window !== "undefined") {
    window.location.replace("/api/authjs/signin");
  }
  return null;
}

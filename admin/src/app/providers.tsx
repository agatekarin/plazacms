"use client";

import { SessionProvider, authConfigManager } from "@hono/auth-js/react";

// Configure basePath to match Hono mounted path
authConfigManager.setConfig({ basePath: "/api/authjs" });

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

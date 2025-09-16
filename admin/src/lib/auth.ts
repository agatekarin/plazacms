import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Ensure DATABASE_URL is set (pool is created in ./db)
if (!process.env.DATABASE_URL) {
  console.warn(
    "[auth] Missing DATABASE_URL env var. Auth will fail to start without it."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  // Use custom pages within the app
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email
            : undefined;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : undefined;
        if (!email || !password) return null;
        const apiBase = process.env.ADMIN_API_BASE_URL;
        if (!apiBase) {
          console.warn("[auth] Missing ADMIN_API_BASE_URL env var");
          return null;
        }
        let url: string;
        try {
          url = new URL("/api/auth/login", apiBase).toString();
        } catch {
          console.error("[auth] Invalid ADMIN_API_BASE_URL:", apiBase);
          return null;
        }

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => ({}))) as any;
        if (!data?.success || !data?.data?.user || !data?.data?.token)
          return null;

        const u = data.data.user as {
          id: string;
          name: string;
          email: string;
          role?: string;
        };
        if (u.role !== "admin") return null;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          image: null,
          role: u.role,
          accessToken: data.data.token,
        } as any;
      },
    }),
  ],
  callbacks: {
    // Persist role on the JWT and session
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        if ((user as any).accessToken) {
          (token as any).accessToken = (user as any).accessToken as string;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string | undefined;
      session.user.id = token.id!;
      (session as any).accessToken = (token as any).accessToken as
        | string
        | undefined;
      return session;
    },
    // Middleware authorization: only admin for protected paths
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // Public paths
      const publicPaths = [
        "/signin",
        "/api/auth",
        "/_next/",
        "/favicon.ico",
        "/assets",
        "/admin/signin",
        "/admin",
      ];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;

      // Admin-only by default
      const user = auth?.user as any | undefined;
      return !!user && user.role === "admin";
    },
    // Redirect safety: only allow same-origin or whitelisted URLs
    async redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        const allowedHosts = [new URL(baseUrl).host];
        if (allowedHosts.includes(u.host)) return u.toString();
        // Fallback to baseUrl for disallowed external redirects
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
});

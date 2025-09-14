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
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Lazy-load Node-only dependencies to keep this module Edge-safe when imported by middleware
        const [{ pool }, bcryptModule] = await Promise.all([
          import("./db"),
          import("bcryptjs"),
        ]);
        const bcrypt = (bcryptModule as any).default || (bcryptModule as any);

        const email =
          typeof credentials?.email === "string"
            ? credentials.email
            : undefined;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : undefined;
        if (!email || !password) return null;

        // Fetch user by email
        const { rows } = await pool.query(
          "SELECT id, name, email, role, image, password_hash FROM public.users WHERE email = $1 LIMIT 1",
          [email]
        );
        const user = rows[0];
        if (!user) return null;

        // Verify password
        const hash =
          typeof user.password_hash === "string"
            ? user.password_hash
            : undefined;
        if (!hash) return null;
        const ok = await bcrypt.compare(password, hash);
        if (!ok) return null;

        // Only allow admin role
        if (user.role !== "admin") return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
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
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string | undefined;
      session.user.id = token.id!;
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
  },
});

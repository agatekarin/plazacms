import NextAuth, { type Session, type User } from 'next-auth';
import { type JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { pool } from './db';
import { authConfig } from './auth.config';

// Ensure DATABASE_URL is set (pool is created in ./db)
if (!process.env.DATABASE_URL) {
  console.warn(
    "[auth] Missing DATABASE_URL env var. Auth will fail to start without it."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
            authorize: async (credentials: Partial<Record<string, unknown>>): Promise<User | null> => {
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
        } as User;
      },
    }),
  ],
  callbacks: {
    // Persist role on the JWT and session
        async jwt({ token, user }: { token: JWT; user: User }): Promise<JWT> {
      if (user) {
                token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
        async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      session.user.role = token.role as string | undefined;
      session.user.id = token.id!;
      return session;
    },
    
  },
});

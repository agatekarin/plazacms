import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

interface DbUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string;
  password_hash: string;
}
import { type Session, type User, getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { type JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "./db";

// Ensure DATABASE_URL is set (pool is created in ./db)
if (!process.env.DATABASE_URL) {
  console.warn(
    "[auth] Missing DATABASE_URL env var. Auth will fail to start without it."
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials: Record<"email" | "password", string> | undefined, req: any): Promise<User | null> => {
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
        const { rows } = await pool.query<DbUser>(
          "SELECT id, name, email, role, image, password_hash FROM public.users WHERE email = $1 LIMIT 1",
          [email]
        );
        const user: DbUser | undefined = rows[0];
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
};



export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}

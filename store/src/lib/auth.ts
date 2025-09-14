import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
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
        const { rows } = await pool.query(
          "SELECT id, name, email, role, image, password_hash FROM public.users WHERE email = $1 LIMIT 1",
          [email]
        );
        const user = rows[0];
        if (!user) return null;
        const hash =
          typeof user.password_hash === "string"
            ? user.password_hash
            : undefined;
        if (!hash) return null;
        const ok = await bcrypt.compare(password, hash);
        if (!ok) return null;
        // Allow all roles for storefront
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
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user.id = token.id as string;
      (session as any).user.role = token.role as string | undefined;
      return session;
    },
  },
});

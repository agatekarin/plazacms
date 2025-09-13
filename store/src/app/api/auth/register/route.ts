import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!name || !email || !password)
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const exists = await db.query(
      `SELECT 1 FROM public.users WHERE email=$1 LIMIT 1`,
      [email]
    );
    if (exists.rows.length > 0)
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO public.users (name, email, role, password_hash) VALUES ($1, $2, 'customer', $3)`,
      [name, email, hash]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}

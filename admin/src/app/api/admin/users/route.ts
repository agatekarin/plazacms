// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev instead

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PUT() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PATCH() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

/*
ORIGINAL CODE COMMENTED OUT:
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const rows = await pool.query(
    `SELECT id, name, email, role, image, created_at
     FROM public.users
     ${q ? "WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1" : ""}
     ORDER BY created_at DESC
     LIMIT 200`,
    q ? [`%${q}%`] : []
  );
  return NextResponse.json({ items: rows.rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string")
    return NextResponse.json({ error: "Email required" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name : null;
  const email = body.email.toLowerCase();
  const role = ["vendor", "customer", "guest"].includes(body.role) ? body.role : "customer";
  if (role === "admin")
    return NextResponse.json({ error: "Cannot assign admin role" }, { status: 400 });

  const password: string | null = typeof body.password === "string" ? body.password : null;
  const hash = password ? await bcrypt.hash(password, 10) : null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO public.users (name, email, role, image, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, image, created_at`,
      [name, email, role, null, hash]
    );
    return NextResponse.json({ item: rows[0] }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

*/

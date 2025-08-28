import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

// GET /api/admin/categories
export async function GET() {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await pool.query("SELECT id, name, slug, created_at FROM public.categories ORDER BY created_at DESC");
  return NextResponse.json({ items: rows });
}

// POST /api/admin/categories
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, slug } = body || {};
  if (!name || !slug) return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  try {
    const { rows } = await pool.query(
      "INSERT INTO public.categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at",
      [name, slug]
    );
    return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
  } catch (err: any) {
    const msg = err?.message || "DB error";
    if (msg.includes("categories_slug_key")) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create category", detail: msg }, { status: 500 });
  }
}

import { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

// GET /api/admin/categories
export async function GET() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, c.image_id, c.created_at,
            m.file_url as image_url, m.alt_text as image_alt
       FROM public.categories c
       LEFT JOIN public.media m ON c.image_id = m.id
       ORDER BY c.created_at DESC`
  );
  return NextResponse.json({ items: rows });
}

// POST /api/admin/categories
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, slug, description, image_id } = body || {};
  if (!name || !slug)
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  try {
    const { rows } = await pool.query(
      "INSERT INTO public.categories (name, slug, description, image_id) VALUES ($1, $2, $3, $4) RETURNING id, name, slug, description, image_id, created_at",
      [name, slug, description || null, image_id || null]
    );
    return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DB error";
    if (msg.includes("categories_slug_key"))
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    return NextResponse.json(
      { error: "Failed to create category", detail: msg },
      { status: 500 }
    );
  }
}

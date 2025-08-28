import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const key of ["name", "slug"]) {
    if (key in body) {
      fields.push(`${key} = $${i++}`);
      values.push((body as any)[key]);
    }
  }
  if (!fields.length) return NextResponse.json({ error: "No fields" }, { status: 400 });
  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE public.categories SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id, name, slug, updated_at`,
      values
    );
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err: any) {
    const msg = err?.message || "DB error";
    if (msg.includes("categories_slug_key")) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update category", detail: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;
  await pool.query("DELETE FROM public.categories WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

import { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

// PATCH name; DELETE attribute
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name } = body || {};
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  const { rows } = await pool.query(
    `UPDATE public.product_attributes SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name`,
    [name, id]
  );
  return NextResponse.json({ ok: true, item: rows[0] });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await pool.query(`DELETE FROM public.product_attributes WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}

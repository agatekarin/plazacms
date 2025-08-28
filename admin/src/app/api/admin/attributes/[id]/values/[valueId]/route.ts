import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { pool } from "../../../../../../../lib/db";

// DELETE /api/admin/attributes/[id]/values/[valueId]
export async function DELETE(_req: Request, { params }: { params: { id: string; valueId: string } }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { valueId } = params;
  await pool.query(`DELETE FROM public.product_attribute_values WHERE id = $1`, [valueId]);
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/attributes/[id]/values/[valueId]
export async function PATCH(req: Request, { params }: { params: { id: string; valueId: string } }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { valueId } = params;
  const body = await req.json().catch(() => ({}));
  const value = (body?.value ?? "").toString().trim();
  if (!value) return NextResponse.json({ error: "value is required" }, { status: 400 });
  try {
    const { rows } = await pool.query(
      `UPDATE public.product_attribute_values SET value = $1 WHERE id = $2 RETURNING id, attribute_id, value`,
      [value, valueId]
    );
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update value", detail: err?.message || "DB error" }, { status: 500 });
  }
}

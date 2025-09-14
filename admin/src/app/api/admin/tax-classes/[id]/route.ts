import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

// PATCH /api/admin/tax-classes/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as { role?: string }).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    name: string;
    rate: number;
    is_active: boolean;
  }>;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    fields.push(`name = $${i++}`);
    values.push(name);
  }

  if (body.rate !== undefined) {
    const rate = Number(body.rate);
    if (Number.isNaN(rate)) return NextResponse.json({ error: "rate must be a number" }, { status: 400 });
    if (rate < 0 || rate > 1)
      return NextResponse.json({ error: "rate must be between 0 and 1 (decimal)" }, { status: 400 });
    fields.push(`rate = $${i++}`);
    values.push(rate);
  }

  if (body.is_active !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(Boolean(body.is_active));
  }

  if (fields.length === 0)
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });

  const sql = `UPDATE public.tax_classes SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id, name, rate, is_active, created_at, updated_at`;
  values.push(id);

  try {
    const { rows } = await pool.query(sql, values);
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    if (msg.includes("tax_classes_name_key"))
      return NextResponse.json({ error: "Name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update tax class", detail: msg }, { status: 500 });
  }
}

// DELETE /api/admin/tax-classes/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as { role?: string }).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // Prevent delete if referenced by products
    const refRes = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM public.products WHERE tax_class_id = $1",
      [id]
    );
    const inUse = Number(refRes.rows?.[0]?.count || 0) > 0;
    if (inUse) {
      return NextResponse.json(
        { error: "Cannot delete: tax class is used by one or more products" },
        { status: 409 }
      );
    }

    await pool.query("DELETE FROM public.tax_classes WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete tax class", detail: (err as Error)?.message || "DB error" },
      { status: 500 }
    );
  }
}

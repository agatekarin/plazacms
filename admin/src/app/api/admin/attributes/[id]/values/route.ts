import { Session } from "../../../../../../lib/auth/types";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { pool } from "../../../../../../lib/db";

// POST /api/admin/attributes/[id]/values -> add a value
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { value } = body || {};
  if (!value || typeof value !== "string")
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  const { rows } = await pool.query(
    `INSERT INTO public.product_attribute_values (attribute_id, value) VALUES ($1, $2) RETURNING id, attribute_id, value`,
    [id, value.trim()]
  );
  return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
}

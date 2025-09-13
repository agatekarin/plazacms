import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// PATCH /api/admin/products/[id]/variants/[variantId]
// Body: { sku?, stock?, status?, weight?, regular_price?, sale_price?, sale_start_date?, sale_end_date? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, variantId } = await params;
  if (!id || !variantId) return NextResponse.json({ error: "Missing id or variantId" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const allowed = ["sku", "stock", "status", "weight", "regular_price", "sale_price", "sale_start_date", "sale_end_date"] as const;
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const key of allowed) {
    if (key in body) {
      let val = (body as any)[key];
      if (["stock", "regular_price", "sale_price", "weight"].includes(key)) {
        if (val === null || val === undefined || val === "") {
          // ensure NOT NULL / numeric fields have a concrete value
          val = 0;
        }
        val = Number(val);
        if (Number.isNaN(val)) return NextResponse.json({ error: `${key} must be a number` }, { status: 400 });
        if (key === "weight") {
          // grams, integer, non-negative
          val = Math.max(0, Math.floor(val));
        }
      }
      if (["sale_start_date", "sale_end_date"].includes(key) && val) {
        val = new Date(val);
      }
      if (key === "status" && !["published", "private", "draft", "archived"].includes(val)) {
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
      }
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });

  const sql = `UPDATE public.product_variants SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} AND product_id = $${i + 1} RETURNING id, sku, stock, status, (weight::int) AS weight, regular_price, sale_price, sale_start_date, sale_end_date, updated_at`;
  values.push(variantId, id);

  try {
    const { rows } = await pool.query(sql, values);
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err: any) {
    const msg: string = err?.message || "DB error";
    if (msg.includes("product_variants_sku_key")) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update variant", detail: msg }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/variants/[variantId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, variantId } = await params;
  if (!id || !variantId) return NextResponse.json({ error: "Missing id or variantId" }, { status: 400 });

  try {
    await pool.query("DELETE FROM public.product_variants WHERE id = $1 AND product_id = $2", [variantId, id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete variant", detail: err?.message || "DB error" }, { status: 500 });
  }
}

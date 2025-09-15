import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

// GET /api/admin/products/[id] -> fetch single product with computed product_type
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sql = `
    SELECT p.id, p.name, p.slug, p.description, p.regular_price, p.currency, p.stock, p.category_id, p.status, p.sku,
           (p.weight::int) AS weight, p.sale_price, p.sale_start_date, p.sale_end_date, p.tax_class_id, p.featured_image_id,
           CASE WHEN COUNT(pv.id) > 0 THEN 'variable' ELSE 'simple' END as product_type
      FROM public.products p
      LEFT JOIN public.product_variants pv ON pv.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, p.name, p.slug, p.description, p.regular_price, p.currency, p.stock, p.category_id, p.status, p.sku,
               p.weight, p.sale_price, p.sale_start_date, p.sale_end_date, p.tax_class_id, p.featured_image_id
  `;
  const { rows } = await pool.query(sql, [id]);
  const item = rows?.[0];
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

// PATCH name; DELETE attribute
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const allowed = [
    "name",
    "slug",
    "description",
    "regular_price",
    "currency",
    "stock",
    "category_id",
    "status",
    "sku",
    "weight",
    "sale_price",
    "sale_start_date",
    "sale_end_date",
    "tax_class_id",
    "product_type",
    "featured_image_id",
  ] as const;

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const key of allowed) {
    if (key in body) {
      let val = (body as any)[key];
      if (["regular_price", "stock", "weight", "sale_price"].includes(key)) {
        if (val === null || val === undefined || val === "") val = 0;
        val = Number(val);
        if (Number.isNaN(val)) return NextResponse.json({ error: `${key} must be a number` }, { status: 400 });
        if (key === "weight") val = Math.max(0, Math.floor(val)); // grams integer
      }
      if (["sale_start_date", "sale_end_date"].includes(key) && val) {
        val = new Date(val);
      }
      fields.push(`${key} = $${i++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });

  const sql = `UPDATE public.products SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id, name, slug, sku, status, stock, (weight::int) AS weight, regular_price, currency, category_id, tax_class_id, updated_at`;
  values.push(id);

  try {
    const { rows } = await pool.query(sql, values);
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err: any) {
    const msg: string = err?.message || "DB error";
    if (msg.includes("products_slug_key")) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    if (msg.includes("products_sku_key")) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update product", detail: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await pool.query("DELETE FROM public.products WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete product", detail: err?.message || "DB error" }, { status: 500 });
  }
}

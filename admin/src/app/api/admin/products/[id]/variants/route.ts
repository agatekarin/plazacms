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
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/admin/products/[id]/variants -> list variants with attribute values
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  if (!productId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sql = `
    SELECT v.id, v.sku, v.stock, v.status, (v.weight::int) AS weight, v.regular_price, v.sale_price, v.sale_start_date, v.sale_end_date, v.created_at,
           COALESCE(json_agg(json_build_object('id', pav.id, 'attribute_id', pav.attribute_id, 'value', pav.value)
             ORDER BY pav.value) FILTER (WHERE pav.id IS NOT NULL), '[]') AS attributes,
           i.file_url AS image_url, i.media_id AS image_id
      FROM public.product_variants v
      LEFT JOIN LATERAL (
        SELECT m.file_url, m.id AS media_id
          FROM public.product_variant_images pvi
          JOIN public.media m ON m.id = pvi.media_id
         WHERE pvi.product_variant_id = v.id
         ORDER BY pvi.display_order ASC
         LIMIT 1
      ) i ON true
      LEFT JOIN public.product_variant_attribute_values vv ON vv.product_variant_id = v.id
      LEFT JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
     WHERE v.product_id = $1
     GROUP BY v.id, v.sale_start_date, v.sale_end_date, v.weight, i.file_url, i.media_id
     ORDER BY v.created_at DESC
  `;
  const { rows } = await pool.query(sql, [productId]);
  return NextResponse.json({ items: rows });
}

// POST /api/admin/products/[id]/variants -> create a single variant
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  if (!productId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const {
    attribute_value_ids = [], // array of attribute_value_id (string)
    sku = null,
    regular_price = null,
    sale_price = null,
    stock = 0,
    status = "draft",
  } = body || {};

  if (!Array.isArray(attribute_value_ids) || attribute_value_ids.length === 0) {
    return NextResponse.json({ error: "attribute_value_ids must be a non-empty array" }, { status: 400 });
  }
  if (["published", "private", "draft", "archived"].includes(status) === false) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Normalize attribute_value_ids: ensure they exist
    const { rows: valRows } = await client.query(
      `SELECT id, attribute_id FROM public.product_attribute_values WHERE id = ANY($1::uuid[])`,
      [attribute_value_ids]
    );
    if (valRows.length !== attribute_value_ids.length) {
      throw new Error("Some attribute_value_ids do not exist");
    }

    // Duplicate check: does a variant with exactly this set exist?
    // Fetch existing variants and compare sets
    const existSql = `
      SELECT v.id, ARRAY_AGG(pav.id ORDER BY pav.id) AS vals
        FROM public.product_variants v
        LEFT JOIN public.product_variant_attribute_values vv ON vv.product_variant_id = v.id
        LEFT JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
       WHERE v.product_id = $1
       GROUP BY v.id
    `;
    const { rows: existing } = await client.query(existSql, [productId]);
    const incomingSorted = [...attribute_value_ids].sort();
    for (const r of existing) {
      const arr = (r.vals || []) as string[];
      if (arr.length === incomingSorted.length && arr.every((x: string, i: number) => x === incomingSorted[i])) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Variant with the same attributes already exists" }, { status: 409 });
      }
    }

    const insertVar = `
      INSERT INTO public.product_variants (product_id, sku, stock, status, regular_price, sale_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, sku, stock, status, regular_price, sale_price, created_at
    `;
    const varValues = [
      productId,
      sku || null,
      Number(stock) || 0,
      status,
      regular_price !== null && regular_price !== undefined ? Number(regular_price) : null,
      sale_price !== null && sale_price !== undefined ? Number(sale_price) : null,
    ];
    const { rows: newVarRows } = await client.query(insertVar, varValues);
    const variantId = newVarRows[0].id as string;

    // Link attribute values
    for (const avId of attribute_value_ids) {
      await client.query(
        `INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id) VALUES ($1, $2)`,
        [variantId, avId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, item: newVarRows[0] }, { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    const msg: string = err?.message || "DB error";
    if (msg.includes("products_variants_sku_key") || msg.includes("product_variants_sku_key")) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create variant", detail: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

*/

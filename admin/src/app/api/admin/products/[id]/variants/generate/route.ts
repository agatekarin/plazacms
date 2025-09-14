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
import { auth } from "../../../../../../../lib/auth";
import { pool } from "../../../../../../../lib/db";

// POST /api/admin/products/[id]/variants/generate
// Body: { selections: Array<Array<string>> } // array of arrays of attribute_value_id
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  if (!productId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const selections: string[][] = Array.isArray(body?.selections) ? body.selections : [];
  if (!selections.length || selections.some(arr => !Array.isArray(arr) || arr.length === 0)) {
    return NextResponse.json({ error: "selections must be non-empty arrays of attribute_value_id" }, { status: 400 });
  }

  // Cartesian product of selections to get combinations
  const combos: string[][] = selections.reduce<string[][]>((acc, arr) => {
    if (acc.length === 0) return arr.map(v => [v]);
    const next: string[][] = [];
    for (const prev of acc) {
      for (const v of arr) next.push([...prev, v]);
    }
    return next;
  }, []);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const created: any[] = [];

    for (const attributes of combos) {
      // Check if a variant with exactly this set exists
      const { rows: existing } = await client.query(
        `SELECT v.id
           FROM public.product_variants v
           JOIN public.product_variant_attribute_values vv ON vv.product_variant_id = v.id
          WHERE v.product_id = $1
          GROUP BY v.id
         HAVING ARRAY_AGG(vv.attribute_value_id ORDER BY vv.attribute_value_id) = $2::uuid[]`,
        [productId, attributes.sort()]
      );
      if (existing.length) continue;

      const inserted = await client.query(
        `INSERT INTO public.product_variants (product_id, status, stock)
         VALUES ($1, 'draft', 0)
         RETURNING id`,
        [productId]
      );
      const variantId = inserted.rows[0].id as string;
      for (const av of attributes) {
        await client.query(
          `INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [variantId, av]
        );
      }
      created.push({ id: variantId });
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, createdCount: created.length });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed to generate variants", detail: err?.message || "DB error" }, { status: 500 });
  } finally {
    client.release();
  }
}

*/

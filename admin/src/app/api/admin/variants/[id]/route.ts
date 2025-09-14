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

// GET /api/admin/variants/[id] -> fetch a single variant with its product and primary image
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sql = `
    SELECT v.id, v.sku, v.stock, v.status,
           v.regular_price, v.sale_price,
           p.id AS product_id, p.name AS product_name, p.slug AS product_slug,
           i.file_url AS image_url
      FROM public.product_variants v
      JOIN public.products p ON p.id = v.product_id
      LEFT JOIN LATERAL (
        SELECT m.file_url
          FROM public.product_variant_images pvi
          JOIN public.media m ON m.id = pvi.media_id
         WHERE pvi.product_variant_id = v.id
         ORDER BY pvi.display_order ASC
         LIMIT 1
      ) i ON true
     WHERE v.id = $1
     LIMIT 1
  `;

  try {
    const { rows } = await pool.query(sql, [id]);
    if (!rows.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: rows[0] });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch variant", detail: err?.message || "DB error" },
      { status: 500 }
    );
  }
}

*/

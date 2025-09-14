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

// GET /api/admin/products/[id]/variants/[variantId]/images
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { variantId, id } = await params;
  if (!id || !variantId) return NextResponse.json({ error: "Missing id or variantId" }, { status: 400 });
  const sql = `SELECT pvi.media_id, pvi.display_order, m.file_url, m.filename
                 FROM public.product_variant_images pvi
                 JOIN public.media m ON m.id = pvi.media_id
                WHERE pvi.product_variant_id = $1
                ORDER BY pvi.display_order ASC`;
  const { rows } = await pool.query(sql, [variantId]);
  return NextResponse.json({ items: rows });
}

// POST /api/admin/products/[id]/variants/[variantId]/images
// Body: { media_id: string, display_order?: number }
export async function POST(req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, variantId } = await params;
  if (!id || !variantId) return NextResponse.json({ error: "Missing id or variantId" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const media_id = body?.media_id as string | undefined;
  const display_order = typeof body?.display_order === "number" ? body.display_order : 0;
  if (!media_id) return NextResponse.json({ error: "media_id is required" }, { status: 400 });
  try {
    await pool.query(
      `INSERT INTO public.product_variant_images (product_variant_id, media_id, display_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_variant_id, media_id) DO UPDATE SET display_order = EXCLUDED.display_order`,
      [variantId, media_id, display_order]
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to add image", detail: err?.message || "DB error" }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/variants/[variantId]/images?mediaId=
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, variantId } = await params;
  if (!id || !variantId) return NextResponse.json({ error: "Missing id or variantId" }, { status: 400 });
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  try {
    await pool.query(
      `DELETE FROM public.product_variant_images WHERE product_variant_id = $1 AND media_id = $2`,
      [variantId, mediaId]
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to remove image", detail: err?.message || "DB error" }, { status: 500 });
  }
}


*/

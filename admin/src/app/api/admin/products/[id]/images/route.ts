import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/admin/products/[id]/images
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const sql = `SELECT pi.media_id, pi.display_order, m.file_url, m.filename
                 FROM public.product_images pi
                 JOIN public.media m ON m.id = pi.media_id
                WHERE pi.product_id = $1
                ORDER BY pi.display_order ASC`;
  const { rows } = await pool.query(sql, [id]);
  return NextResponse.json({ items: rows });
}

// POST /api/admin/products/[id]/images  Body: { media_id, display_order? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const media_id = body?.media_id as string | undefined;
  const display_order = typeof body?.display_order === "number" ? body.display_order : 0;
  if (!media_id) return NextResponse.json({ error: "media_id is required" }, { status: 400 });
  try {
    await pool.query(
      `INSERT INTO public.product_images (product_id, media_id, display_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, media_id) DO UPDATE SET display_order = EXCLUDED.display_order`,
      [id, media_id, display_order]
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to add image", detail: err?.message || "DB error" }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/images?mediaId=
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  try {
    await pool.query(`DELETE FROM public.product_images WHERE product_id = $1 AND media_id = $2`, [id, mediaId]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to remove image", detail: err?.message || "DB error" }, { status: 500 });
  }
}


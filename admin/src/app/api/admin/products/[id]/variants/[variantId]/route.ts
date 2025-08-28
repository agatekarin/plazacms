import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { pool } from "../../../../../../../lib/db";

// DELETE /api/admin/products/[id]/variants/[variantId]
export async function DELETE(_req: Request, { params }: { params: { id: string; variantId: string } }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, variantId } = params;
  if (!id || !variantId) return NextResponse.json({ error: "Missing id or variantId" }, { status: 400 });

  try {
    await pool.query("DELETE FROM public.product_variants WHERE id = $1 AND product_id = $2", [variantId, id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete variant", detail: err?.message || "DB error" }, { status: 500 });
  }
}

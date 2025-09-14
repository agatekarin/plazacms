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
import { toSlug } from "@/lib/utils";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; methodId: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gatewayId, methodId } = await context.params;
  if (!gatewayId || !methodId)
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT id, gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id, created_at, updated_at FROM public.payment_methods WHERE id = $1 AND gateway_id = $2`,
      [methodId, gatewayId]
    );
    if (!rows.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: rows[0] });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch method",
        detail: (err as Error)?.message || "DB error",
      },
      { status: 500 }
    );
  }
}

// Using runtime checks instead of zod here to avoid bundling issues

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; methodId: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gatewayId, methodId } = await context.params;
  if (!gatewayId || !methodId)
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });

  const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (typeof data.name === "string") {
    const val = data.name.trim();
    if (!val)
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 }
      );
    fields.push(`name = $${i++}`);
    values.push(val);
  }
  if (typeof data.slug === "string") {
    const val =
      data.slug.trim() ||
      (typeof data.name === "string" ? toSlug(data.name) : "");
    if (!val)
      return NextResponse.json(
        { error: "slug cannot be empty" },
        { status: 400 }
      );
    fields.push(`slug = $${i++}`);
    values.push(val);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${i++}`);
    values.push(data.description);
  }
  if (data.is_enabled !== undefined) {
    fields.push(`is_enabled = $${i++}`);
    values.push(Boolean(data.is_enabled));
  }
  if (data.settings !== undefined) {
    fields.push(`settings = $${i++}::jsonb`);
    values.push(data.settings === null ? null : JSON.stringify(data.settings));
  }
  if (data.display_order !== undefined) {
    const displayOrder =
      typeof data.display_order === "number" ? data.display_order : 0;
    fields.push(`display_order = $${i++}`);
    values.push(Math.max(0, displayOrder));
  }
  if (data.logo_media_id !== undefined) {
    fields.push(`logo_media_id = $${i++}`);
    values.push(data.logo_media_id);
  }

  if (!fields.length)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const sql = `UPDATE public.payment_methods SET ${fields.join(
    ", "
  )}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} AND gateway_id = $${
    i + 1
  } RETURNING id, gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id, created_at, updated_at`;
  values.push(methodId, gatewayId);

  try {
    const { rows } = await pool.query(sql, values);
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err) {
    const e = err as any;
    const detail = e?.message || e?.toString?.() || "DB error";
    if (
      typeof detail === "string" &&
      detail.includes("payment_methods_gateway_id_slug_key")
    )
      return NextResponse.json(
        { error: "Slug already exists for this gateway" },
        { status: 409 }
      );
    return NextResponse.json(
      { error: "Failed to update method", detail },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; methodId: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gatewayId, methodId } = await context.params;
  if (!gatewayId || !methodId)
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });

  try {
    await pool.query(
      "DELETE FROM public.payment_methods WHERE id = $1 AND gateway_id = $2",
      [methodId, gatewayId]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to delete method",
        detail: (err as Error)?.message || "DB error",
      },
      { status: 500 }
    );
  }
}

*/

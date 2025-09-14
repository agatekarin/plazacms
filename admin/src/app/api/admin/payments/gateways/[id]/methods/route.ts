import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { toSlug } from "@/lib/utils";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gatewayId } = await context.params;
  if (!gatewayId)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT pm.id, pm.gateway_id, pm.name, pm.slug, pm.description, pm.is_enabled, pm.settings,
              pm.display_order, pm.logo_media_id, m.file_url AS logo_url, pm.created_at, pm.updated_at
       FROM public.payment_methods pm
       LEFT JOIN public.media m ON m.id = pm.logo_media_id
       WHERE pm.gateway_id = $1
       ORDER BY pm.display_order, pm.name`,
      [gatewayId]
    );
    return NextResponse.json({ items: rows });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch methods",
        detail: (err as Error)?.message || "DB error",
      },
      { status: 500 }
    );
  }
}

// Using runtime checks instead of zod here to avoid bundling issues

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: gatewayId } = await context.params;
  if (!gatewayId)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof json.name === "string" ? json.name : "";
  if (!name.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  const slug = typeof json.slug === "string" ? json.slug : undefined;
  const description =
    typeof json.description === "string" ? json.description : undefined;
  const is_enabled =
    json.is_enabled === undefined ? true : Boolean(json.is_enabled);
  const settings =
    json.settings && typeof json.settings === "object"
      ? (json.settings as Record<string, unknown>)
      : null;
  const display_order =
    Number.isFinite(Number(json.display_order)) &&
    Number(json.display_order) >= 0
      ? Number(json.display_order)
      : 0;
  const logo_media_id =
    typeof json.logo_media_id === "string" ? json.logo_media_id : undefined;
  const finalSlug = (slug && slug.trim()) || toSlug(name);

  try {
    const insertSql = `
      INSERT INTO public.payment_methods (gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING id, gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id, created_at, updated_at
    `;
    const { rows } = await pool.query(insertSql, [
      gatewayId,
      name.trim(),
      finalSlug,
      description ?? null,
      is_enabled,
      settings === null ? null : JSON.stringify(settings),
      display_order,
      logo_media_id ?? null,
    ]);
    return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    if (msg.includes("payment_methods_gateway_id_slug_key"))
      return NextResponse.json(
        { error: "Slug already exists for this gateway" },
        { status: 409 }
      );
    return NextResponse.json(
      { error: "Failed to create method", detail: msg },
      { status: 500 }
    );
  }
}

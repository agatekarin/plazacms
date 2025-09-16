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

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.slug, g.description, g.is_enabled, g.settings, g.logo_media_id, g.created_at, g.updated_at,
              m.file_url AS logo_url
       FROM public.payment_gateways g
       LEFT JOIN public.media m ON m.id = g.logo_media_id
       WHERE g.id = $1`,
      [id]
    );
    if (!rows.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: rows[0] });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch gateway",
        detail: (err as Error)?.message || "DB error",
      },
      { status: 500 }
    );
  }
}

// Using runtime checks instead of zod here to avoid bundling issues

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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
  if (data.logo_media_id !== undefined) {
    fields.push(`logo_media_id = $${i++}`);
    values.push(data.logo_media_id);
  }

  if (!fields.length)
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const sql = `WITH upd AS (
    UPDATE public.payment_gateways SET ${fields.join(
      ", "
    )}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id, name, slug, description, is_enabled, settings, logo_media_id, created_at, updated_at
  )
  SELECT upd.*, m.file_url AS logo_url
  FROM upd
  LEFT JOIN public.media m ON m.id = upd.logo_media_id`;
  values.push(id);

  try {
    const { rows } = await pool.query(sql, values);
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err) {
    const e = err as any;
    const detail = e?.message || e?.toString?.() || "DB error";
    if (
      typeof detail === "string" &&
      detail.includes("payment_gateways_slug_key")
    )
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    if (
      typeof detail === "string" &&
      detail.includes("payment_gateways_name_key")
    )
      return NextResponse.json(
        { error: "Name already exists" },
        { status: 409 }
      );
    return NextResponse.json(
      { error: "Failed to update gateway", detail },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    // Deleting a gateway cascades to methods via FK, ensure it's okay
    await pool.query("DELETE FROM public.payment_gateways WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to delete gateway",
        detail: (err as Error)?.message || "DB error",
      },
      { status: 500 }
    );
  }
}

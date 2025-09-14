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

export async function GET(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const onlyEnabled = url.searchParams.get("enabled") === "true";

  const where = onlyEnabled ? "WHERE is_enabled = true" : "";
  const sql = `
    SELECT id, name, slug, description, is_enabled, settings, logo_media_id,
           created_at, updated_at
    FROM public.payment_gateways
    ${where}
    ORDER BY name ASC
  `;
  try {
    const { rows } = await pool.query(sql);
    return NextResponse.json({ items: rows });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to fetch gateways", detail: msg },
      { status: 500 }
    );
  }
}

// Using runtime checks instead of zod here to avoid bundling issues

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const logo_media_id =
    typeof json.logo_media_id === "string" ? json.logo_media_id : undefined;
  const finalSlug = (slug && slug.trim()) || toSlug(name);

  try {
    const insertSql = `
      INSERT INTO public.payment_gateways (name, slug, description, is_enabled, settings, logo_media_id)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING id, name, slug, description, is_enabled, settings, logo_media_id, created_at, updated_at
    `;
    const { rows } = await pool.query(insertSql, [
      name.trim(),
      finalSlug,
      description ?? null,
      is_enabled,
      settings === null ? null : JSON.stringify(settings),
      logo_media_id ?? null,
    ]);
    return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    if (msg.includes("payment_gateways_slug_key"))
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    if (msg.includes("payment_gateways_name_key"))
      return NextResponse.json(
        { error: "Name already exists" },
        { status: 409 }
      );
    return NextResponse.json(
      { error: "Failed to create gateway", detail: msg },
      { status: 500 }
    );
  }
}

*/

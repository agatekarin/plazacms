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
import { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const fields: string[] = [];
  const values: string[] = [];
  let i = 1;
  for (const key of ["name", "slug", "description", "image_id"]) {
    if (key in body) {
      fields.push(`${key} = $${i++}`);
      values.push(body[key] as string);
    }
  }
  if (!fields.length)
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE public.categories SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id, name, slug, description, image_id, updated_at`,
      values
    );
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DB error";
    if (msg.includes("categories_slug_key"))
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    return NextResponse.json(
      { error: "Failed to update category", detail: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await pool.query("DELETE FROM public.categories WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

*/

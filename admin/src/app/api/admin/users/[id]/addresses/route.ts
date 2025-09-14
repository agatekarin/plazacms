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
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { rows } = await pool.query(`SELECT * FROM public.user_addresses WHERE user_id = $1 ORDER BY created_at DESC`, [id]);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const b = await req.json();
  const { rows } = await pool.query(
    `INSERT INTO public.user_addresses (user_id, address_name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      id,
      b.address_name || "",
      b.recipient_name || "",
      b.phone_number || "",
      b.street_address || "",
      b.city || "",
      b.state || "",
      b.postal_code || "",
      b.country || "",
      !!b.is_default,
    ]
  );
  if (b.is_default) {
    await pool.query(`UPDATE public.user_addresses SET is_default = FALSE WHERE user_id = $1 AND id <> $2`, [id, rows[0].id]);
  }
  return NextResponse.json({ item: rows[0] }, { status: 201 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: userId } = await ctx.params;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "Address id required" }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const key of ["address_name","recipient_name","phone_number","street_address","city","state","postal_code","country"]) {
    if (typeof b[key] === "string") { fields.push(`${key} = $${i++}`); values.push(b[key]); }
  }
  if (typeof b.is_default === "boolean") { fields.push(`is_default = $${i++}`); values.push(!!b.is_default); }
  if (!fields.length) return NextResponse.json({ error: "No changes" }, { status: 400 });

  const { rows } = await pool.query(
    `UPDATE public.user_addresses SET ${fields.join(", ")} WHERE id = $${i} AND user_id = $${i+1} RETURNING *`,
    [...values, b.id, userId]
  );
  if (b.is_default) {
    await pool.query(`UPDATE public.user_addresses SET is_default = FALSE WHERE user_id = $1 AND id <> $2`, [userId, b.id]);
  }
  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: userId } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b?.id) return NextResponse.json({ error: "Address id required" }, { status: 400 });
  await pool.query(`DELETE FROM public.user_addresses WHERE id = $1 AND user_id = $2`, [b.id, userId]);
  return NextResponse.json({ success: true });
}

*/

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const u = await pool.query(
    `SELECT id, name, email, role, image, created_at FROM public.users WHERE id = $1`,
    [id]
  );
  if (!u.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const addr = await pool.query(
    `SELECT id, user_id, address_name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default, created_at
     FROM public.user_addresses WHERE user_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  return NextResponse.json({ item: u.rows[0], addresses: addr.rows });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Method override from form
  if (req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    await req.formData();
  }

  const { id } = await ctx.params;
  const { rows } = await pool.query(`SELECT role FROM public.users WHERE id = $1`, [id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rows[0].role === "admin") return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });

  await pool.query(`DELETE FROM public.user_addresses WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM public.accounts WHERE user_id = $1`, [id]).catch(() => {});
  await pool.query(`DELETE FROM public.sessions WHERE user_id = $1`, [id]).catch(() => {});
  await pool.query(`UPDATE public.media SET entity_id = NULL WHERE media_type = 'user_profile' AND entity_id = $1`, [id]);
  await pool.query(`DELETE FROM public.users WHERE id = $1`, [id]);

  return NextResponse.json({ success: true });
}

// Update user profile (name, email, role with restrictions) and avatar via avatar_media_id
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null) as unknown;
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const b = body as Partial<{ name: string; email: string; role: "admin" | "vendor" | "customer" | "guest"; image: string; avatar_media_id: string }>;

  // Gather existing role to enforce restrictions
  const current = await pool.query(`SELECT role FROM public.users WHERE id = $1`, [id]);
  if (!current.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const currentRole = current.rows[0].role as "admin" | "vendor" | "customer" | "guest";

  // Build update for profile fields
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (typeof b.name === "string") { fields.push(`name = $${i++}`); values.push(b.name); }
  if (typeof b.email === "string") { fields.push(`email = $${i++}`); values.push(b.email); }
  if (typeof b.image === "string") { fields.push(`image = $${i++}`); values.push(b.image); }
  if (typeof b.role === "string") {
    // Cannot change the role of an existing admin user at all
    if (currentRole === "admin") {
      return NextResponse.json({ error: "Cannot change admin role" }, { status: 400 });
    }
    // Cannot assign admin via API
    if (b.role === "admin") {
      return NextResponse.json({ error: "Admin role cannot be assigned" }, { status: 400 });
    }
    fields.push(`role = $${i++}`); values.push(b.role);
  }
  if (fields.length) {
    fields.push(`updated_at = NOW()`);
    await pool.query(`UPDATE public.users SET ${fields.join(", ")} WHERE id = $${i}`, [...values, id]);
  }

  // Handle avatar update if provided
  if (b.avatar_media_id) {
    const m = await pool.query(
      `SELECT id, file_url FROM public.media WHERE id = $1 AND media_type = 'user_profile'`,
      [b.avatar_media_id]
    );
    if (!m.rows[0]) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    await pool.query(`UPDATE public.media SET entity_id = $1 WHERE id = $2`, [id, b.avatar_media_id]);
    await pool.query(`UPDATE public.users SET image = $1, updated_at = NOW() WHERE id = $2`, [m.rows[0].file_url, id]);
  }

  // Return updated user + addresses
  const u = await pool.query(
    `SELECT id, name, email, role, image, created_at FROM public.users WHERE id = $1`,
    [id]
  );
  const addr = await pool.query(
    `SELECT id, user_id, address_name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default, created_at
     FROM public.user_addresses WHERE user_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  return NextResponse.json({ item: u.rows[0], addresses: addr.rows });
}

// Support HTML form POST with method override (DELETE only)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    return NextResponse.json({ error: "Unsupported" }, { status: 400 });
  }
  const form = await req.formData();
  const method = (form.get("_method") || "").toString().toUpperCase();
  if (method === "DELETE") {
    return DELETE(req, ctx);
  }
  return NextResponse.json({ error: "Unsupported method" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { newPassword } = await req.json().catch(() => ({} as { newPassword?: unknown }));
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Ensure user exists
  const u = await pool.query(`SELECT id FROM public.users WHERE id = $1`, [id]);
  if (!u.rows[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [hash, id]
  );

  return NextResponse.json({ ok: true });
}

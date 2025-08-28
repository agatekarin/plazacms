import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any | undefined;
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json().catch(() => ({}));
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // Fetch current user with password_hash
    const { rows } = await pool.query(
      "SELECT id, email, password_hash FROM public.users WHERE email = $1 LIMIT 1",
      [user.email]
    );
    const row = rows[0];
    if (!row || typeof row.password_hash !== "string") {
      return NextResponse.json({ error: "User not found or password not set" }, { status: 404 });
    }

    // Verify current password
    const ok = await bcrypt.compare(currentPassword, row.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Prevent reusing the same password
    const same = await bcrypt.compare(newPassword, row.password_hash);
    if (same) {
      return NextResponse.json({ error: "New password must be different" }, { status: 400 });
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newHash, row.id]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[change-password]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

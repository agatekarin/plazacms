import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

// GET /api/admin/tax-classes -> list tax classes (optionally by status)
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as { role?: string }).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const onlyActive = url.searchParams.get("active") === "true";

  const where = onlyActive ? "WHERE is_active = true" : "";
  const sql = `SELECT id, name, rate, is_active, created_at, updated_at FROM public.tax_classes ${where} ORDER BY name ASC`;

  try {
    const { rows } = await pool.query(sql);
    return NextResponse.json({ items: rows });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json({ error: "Failed to fetch tax classes", detail: msg }, { status: 500 });
  }
}

// POST /api/admin/tax-classes -> create new tax class
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as { role?: string }).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    rate?: number;
    is_active?: boolean;
  };

  const name = (body.name || "").trim();
  const rateRaw = body.rate;
  const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (rateRaw === undefined || rateRaw === null || Number.isNaN(Number(rateRaw)))
    return NextResponse.json({ error: "rate must be a number" }, { status: 400 });

  const rate = Number(rateRaw);
  if (rate < 0 || rate > 1)
    return NextResponse.json({ error: "rate must be between 0 and 1 (decimal)" }, { status: 400 });

  try {
    const insertSql = `
      INSERT INTO public.tax_classes (name, rate, is_active)
      VALUES ($1, $2, $3)
      RETURNING id, name, rate, is_active, created_at, updated_at
    `;
    const { rows } = await pool.query(insertSql, [name, rate, is_active]);
    return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    if (msg.includes("tax_classes_name_key"))
      return NextResponse.json({ error: "Name already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create tax class", detail: msg }, { status: 500 });
  }
}

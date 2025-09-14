import { Session } from "next-auth";

interface ProductAttribute {
  id: string;
  name: string;
}

interface ProductAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
}
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

// GET /api/admin/attributes -> list attributes with values
export async function GET() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [attrs, vals] = await Promise.all([
    pool.query(
      "SELECT id, name FROM public.product_attributes ORDER BY name ASC"
    ),
    pool.query(
      "SELECT id, attribute_id, value FROM public.product_attribute_values ORDER BY value ASC"
    ),
  ]);
  const valuesByAttr = vals.rows.reduce(
    (
      acc: Record<string, { id: string; value: string }[]>,
      v: ProductAttributeValue
    ) => {
      (acc[v.attribute_id] ||= []).push({ id: v.id, value: v.value });
      return acc;
    },
    {}
  );

  const items = attrs.rows.map((a: ProductAttribute) => ({
    id: a.id,
    name: a.name,
    values: valuesByAttr[a.id] || [],
  }));
  return NextResponse.json({ items });
}

// POST /api/admin/attributes -> create attribute (and optional values)
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { name, values = [] } = body || {};
  if (!name || typeof name !== "string")
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO public.product_attributes (name) VALUES ($1) RETURNING id, name`,
      [name]
    );
    const attr = ins.rows[0];
    if (Array.isArray(values) && values.length) {
      for (const v of values) {
        if (typeof v === "string" && v.trim()) {
          await client.query(
            `INSERT INTO public.product_attribute_values (attribute_id, value) VALUES ($1, $2)`,
            [attr.id, v.trim()]
          );
        }
      }
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, item: attr }, { status: 201 });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error: "Failed to create attribute",
        detail: err instanceof Error ? err.message : "DB error",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

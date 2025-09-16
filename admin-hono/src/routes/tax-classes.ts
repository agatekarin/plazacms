import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const taxes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/tax-classes
taxes.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const onlyActive = url.searchParams.get("active") === "true";
  const rows = await sql`
    SELECT id, name, rate, is_active, created_at, updated_at
    FROM public.tax_classes
    ${onlyActive ? sql`WHERE is_active = true` : sql``}
    ORDER BY name ASC
  `;
  return c.json({ items: rows });
});

// POST /api/admin/tax-classes
const createSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(1),
  is_active: z.boolean().optional().default(true),
});

taxes.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);
  const b = parsed.data;
  try {
    const rows = await sql`
      INSERT INTO public.tax_classes (name, rate, is_active)
      VALUES (${b.name}, ${b.rate}, ${b.is_active})
      RETURNING id, name, rate, is_active, created_at, updated_at
    `;
    return c.json({ ok: true, item: rows[0] }, 201);
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("tax_classes_name_key"))
      return c.json({ error: "Name already exists" }, 409);
    return c.json({ error: "Failed to create tax class", detail: msg }, 500);
  }
});

export default taxes;

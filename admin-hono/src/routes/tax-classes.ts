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

// GET /api/admin/tax-classes/:id - get one tax class
taxes.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const rows = await sql`
    SELECT id, name, rate, is_active, created_at, updated_at
    FROM public.tax_classes
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ item: rows[0] });
});

// PATCH /api/admin/tax-classes/:id - update fields
taxes.patch("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({} as any));

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const setField = (cond: boolean, field: string, val: any) => {
    if (!cond) return;
    fields.push(`${field} = $${i++}`);
    values.push(val);
  };

  if (typeof body.name === "string" && body.name.trim()) {
    setField(true, "name", body.name.trim());
  }
  if (typeof body.rate === "number" && body.rate >= 0 && body.rate <= 1) {
    setField(true, "rate", body.rate);
  }
  if (typeof body.is_active === "boolean") {
    setField(true, "is_active", body.is_active);
  }

  if (fields.length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  const setSql = fields.join(", ");

  try {
    const updateSql = `
      UPDATE public.tax_classes
      SET ${setSql}
      WHERE id = $${i}
      RETURNING id, name, rate, is_active, created_at, updated_at
    `;
    const rows = await (sql as any).unsafe(updateSql, values.concat(id));
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true, item: rows[0] });
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("tax_classes_name_key"))
      return c.json({ error: "Name already exists" }, 409);
    return c.json({ error: "Failed to update tax class", detail: msg }, 500);
  }
});

// DELETE /api/admin/tax-classes/:id - remove one
taxes.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  try {
    const rows = await sql`
      DELETE FROM public.tax_classes
      WHERE id = ${id}
      RETURNING id
    `;
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    return c.json({ error: "Failed to delete tax class", detail: msg }, 500);
  }
});

export default taxes;

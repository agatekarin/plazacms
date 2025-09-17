import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

type AppEnv = { Bindings: Env; Variables: { user: any } };

const settings = new Hono<AppEnv>();

// Reasonable defaults matching the admin UI expectations
const DEFAULT_SETTINGS = {
  default_country: "ID",
  default_currency: "IDR",
  weight_unit: "g",
  dimension_unit: "cm",
  enable_free_shipping: true,
  free_shipping_threshold: 100000,
  max_weight_limit: 30000,
  enable_shipping_zones: true,
  enable_shipping_calculator: true,
  shipping_tax_status: "taxable",
  shipping_tax_class: "standard",
  hide_shipping_until_address: false,
  enable_debug_mode: false,
};

async function ensureTable(sql: any) {
  await (sql as any).unsafe(`
    CREATE TABLE IF NOT EXISTS public.shipping_settings (
      id SERIAL PRIMARY KEY,
      default_country TEXT,
      default_currency TEXT,
      weight_unit TEXT,
      dimension_unit TEXT,
      enable_free_shipping BOOLEAN DEFAULT false,
      free_shipping_threshold NUMERIC DEFAULT 0,
      max_weight_limit INTEGER DEFAULT 0,
      enable_shipping_zones BOOLEAN DEFAULT true,
      enable_shipping_calculator BOOLEAN DEFAULT true,
      shipping_tax_status TEXT DEFAULT 'taxable',
      shipping_tax_class TEXT DEFAULT 'standard',
      hide_shipping_until_address BOOLEAN DEFAULT false,
      enable_debug_mode BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

// GET /api/admin/settings/shipping - fetch settings from Postgres
settings.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    await ensureTable(sql);
    const rows = await sql`SELECT * FROM public.shipping_settings LIMIT 1`;
    if (rows.length === 0) return c.json({ settings: DEFAULT_SETTINGS });
    return c.json({ settings: rows[0] });
  } catch (e: any) {
    return c.json({ settings: DEFAULT_SETTINGS });
  }
});

// PATCH /api/admin/settings/shipping - save settings to Postgres
settings.patch("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    await ensureTable(sql);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;

    const existing = await sql`SELECT id FROM public.shipping_settings LIMIT 1`;

    const allowed = [
      "default_country",
      "default_currency",
      "weight_unit",
      "dimension_unit",
      "enable_free_shipping",
      "free_shipping_threshold",
      "max_weight_limit",
      "enable_shipping_zones",
      "enable_shipping_calculator",
      "shipping_tax_status",
      "shipping_tax_class",
      "hide_shipping_until_address",
      "enable_debug_mode",
    ];

    const next: Record<string, any> = {};
    for (const k of allowed) if (k in body) next[k] = body[k];
    if (Object.keys(next).length === 0)
      return c.json({ error: "No fields to update" }, 400);
    next.updated_at = new Date();

    if (existing.length === 0) {
      const initial = { ...DEFAULT_SETTINGS, ...next };
      const rows = await sql`INSERT INTO public.shipping_settings ${sql(
        initial
      )} RETURNING *`;
      return c.json({ ok: true, settings: rows[0] });
    } else {
      const rows = await sql`
        UPDATE public.shipping_settings SET ${sql(next)}
        WHERE id = ${existing[0].id}
        RETURNING *`;
      return c.json({ ok: true, settings: rows[0] });
    }
  } catch (e: any) {
    return c.json(
      { error: "Failed to save settings", detail: String(e?.message || e) },
      500
    );
  }
});

export default settings;

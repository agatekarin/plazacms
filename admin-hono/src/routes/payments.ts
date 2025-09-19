import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const payments = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/payments/gateways - list gateways (optional ?enabled=true)
payments.get("/gateways", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const onlyEnabled = url.searchParams.get("enabled") === "true";
  const rows = await sql`
    SELECT g.id, g.name, g.slug, g.description, g.is_enabled, g.settings, g.logo_media_id,
           g.created_at, g.updated_at,
           m.file_url AS logo_url
    FROM public.payment_gateways g
    LEFT JOIN public.media m ON m.id = g.logo_media_id
    ${onlyEnabled ? sql`WHERE g.is_enabled = true` : sql``}
    ORDER BY g.name ASC
  `;
  return c.json({ items: rows });
});

// POST /api/admin/payments/gateways - create gateway
payments.post("/gateways", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const b = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return c.json({ error: "name is required" }, 400);
  const slug =
    typeof b.slug === "string" && b.slug.trim() ? b.slug.trim() : null;
  const description = typeof b.description === "string" ? b.description : null;
  const is_enabled = b.is_enabled === undefined ? true : Boolean(b.is_enabled);
  const settings =
    b.settings && typeof b.settings === "object"
      ? JSON.stringify(b.settings)
      : null;
  const logo_media_id =
    typeof b.logo_media_id === "string" ? b.logo_media_id : null;

  try {
    const rows = await sql`
      WITH ins AS (
        INSERT INTO public.payment_gateways (name, slug, description, is_enabled, settings, logo_media_id)
        VALUES (${name}, ${slug}, ${description}, ${is_enabled}, ${settings}::jsonb, ${logo_media_id})
        RETURNING id, name, slug, description, is_enabled, settings, logo_media_id, created_at, updated_at
      )
      SELECT ins.*, m.file_url AS logo_url
      FROM ins
      LEFT JOIN public.media m ON m.id = ins.logo_media_id
    `;
    return c.json({ ok: true, item: rows[0] }, 201);
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("payment_gateways_slug_key"))
      return c.json({ error: "Slug already exists" }, 409);
    if (msg.includes("payment_gateways_name_key"))
      return c.json({ error: "Name already exists" }, 409);
    return c.json({ error: "Failed to create gateway", detail: msg }, 500);
  }
});

// GET /api/admin/payments/gateways/:id - get one
payments.get("/gateways/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const rows = await sql`
    SELECT g.id, g.name, g.slug, g.description, g.is_enabled, g.settings, g.logo_media_id,
           g.created_at, g.updated_at, m.file_url AS logo_url
    FROM public.payment_gateways g
    LEFT JOIN public.media m ON m.id = g.logo_media_id
    WHERE g.id = ${id}
  `;
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ item: rows[0] });
});

// PATCH /api/admin/payments/gateways/:id - update
payments.patch("/gateways/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const b = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const setField = (cond: boolean, field: string, val: any) => {
    if (!cond) return;
    fields.push(`${field} = $${i++}`);
    values.push(val);
  };
  if (typeof b.name === "string") {
    const val = b.name.trim();
    if (!val) return c.json({ error: "name cannot be empty" }, 400);
    setField(true, "name", val);
  }
  if (typeof b.slug === "string") {
    const val =
      b.slug.trim() ||
      (typeof b.name === "string"
        ? b.name.trim().toLowerCase().replace(/\s+/g, "-")
        : "");
    if (!val) return c.json({ error: "slug cannot be empty" }, 400);
    setField(true, "slug", val);
  }
  if (b.description !== undefined) setField(true, "description", b.description);
  if (b.is_enabled !== undefined)
    setField(true, "is_enabled", Boolean(b.is_enabled));
  if (b.settings !== undefined)
    setField(
      true,
      "settings",
      b.settings === null ? null : JSON.stringify(b.settings)
    );
  if (b.logo_media_id !== undefined)
    setField(true, "logo_media_id", b.logo_media_id);

  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  const sqlText = `WITH upd AS (
    UPDATE public.payment_gateways SET ${fields.join(", ")}
    WHERE id = $${i} RETURNING id, name, slug, description, is_enabled, settings, logo_media_id, created_at, updated_at
  ) SELECT upd.*, m.file_url AS logo_url FROM upd LEFT JOIN public.media m ON m.id = upd.logo_media_id`;
  try {
    const rows = await (sql as any).unsafe(sqlText, values.concat(id));
    return c.json({ ok: true, item: rows[0] });
  } catch (e: any) {
    const detail = String(e?.message || e || "DB error");
    if (detail.includes("payment_gateways_slug_key"))
      return c.json({ error: "Slug already exists" }, 409);
    if (detail.includes("payment_gateways_name_key"))
      return c.json({ error: "Name already exists" }, 409);
    return c.json({ error: "Failed to update gateway", detail }, 500);
  }
});

// DELETE /api/admin/payments/gateways/:id
payments.delete("/gateways/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  try {
    await sql`DELETE FROM public.payment_gateways WHERE id = ${id}`;
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json(
      { error: "Failed to delete gateway", detail: String(e?.message || e) },
      500
    );
  }
});

// GET /api/admin/payments/gateways/:id/methods
payments.get("/gateways/:id/methods", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const rows = await sql`
    SELECT pm.id, pm.gateway_id, pm.name, pm.slug, pm.description, pm.is_enabled, pm.settings,
           pm.display_order, pm.logo_media_id, m.file_url AS logo_url, pm.created_at, pm.updated_at
    FROM public.payment_methods pm
    LEFT JOIN public.media m ON m.id = pm.logo_media_id
    WHERE pm.gateway_id = ${id}
    ORDER BY pm.display_order, pm.name
  `;
  return c.json({ items: rows });
});

// POST /api/admin/payments/gateways/:id/methods
payments.post("/gateways/:id/methods", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const b = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return c.json({ error: "name is required" }, 400);
  const slug =
    typeof b.slug === "string" && b.slug.trim() ? b.slug.trim() : null;
  const description = typeof b.description === "string" ? b.description : null;
  const is_enabled = b.is_enabled === undefined ? true : Boolean(b.is_enabled);
  const settings =
    b.settings && typeof b.settings === "object"
      ? JSON.stringify(b.settings)
      : null;
  const display_order =
    Number.isFinite(Number(b.display_order)) && Number(b.display_order) >= 0
      ? Number(b.display_order)
      : 0;
  const logo_media_id =
    typeof b.logo_media_id === "string" ? b.logo_media_id : null;

  try {
    const rows = await sql`
      INSERT INTO public.payment_methods (gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id)
      VALUES (${id}, ${name}, ${slug}, ${description}, ${is_enabled}, ${settings}::jsonb, ${display_order}, ${logo_media_id})
      RETURNING id, gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id, created_at, updated_at
    `;
    return c.json({ ok: true, item: rows[0] }, 201);
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("payment_methods_gateway_id_slug_key"))
      return c.json({ error: "Slug already exists for this gateway" }, 409);
    return c.json({ error: "Failed to create method", detail: msg }, 500);
  }
});

// GET /api/admin/payments/gateways/:id/methods/:methodId
payments.get(
  "/gateways/:id/methods/:methodId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id, methodId } = c.req.param();
    const rows = await sql`
    SELECT id, gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id, created_at, updated_at
    FROM public.payment_methods WHERE id = ${methodId} AND gateway_id = ${id}
  `;
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json({ item: rows[0] });
  }
);

// PATCH /api/admin/payments/gateways/:id/methods/:methodId
payments.patch(
  "/gateways/:id/methods/:methodId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id, methodId } = c.req.param();
    const b = (await c.req.json().catch(() => ({}))) as Record<string, any>;
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const setField = (cond: boolean, field: string, val: any) => {
      if (!cond) return;
      fields.push(`${field} = $${i++}`);
      values.push(val);
    };
    if (typeof b.name === "string") {
      const val = b.name.trim();
      if (!val) return c.json({ error: "name cannot be empty" }, 400);
      setField(true, "name", val);
    }
    if (typeof b.slug === "string") {
      const val =
        b.slug.trim() ||
        (typeof b.name === "string"
          ? b.name.trim().toLowerCase().replace(/\s+/g, "-")
          : "");
      if (!val) return c.json({ error: "slug cannot be empty" }, 400);
      setField(true, "slug", val);
    }
    if (b.description !== undefined)
      setField(true, "description", b.description);
    if (b.is_enabled !== undefined)
      setField(true, "is_enabled", Boolean(b.is_enabled));
    if (b.settings !== undefined)
      setField(
        true,
        "settings",
        b.settings === null ? null : JSON.stringify(b.settings)
      );
    if (b.display_order !== undefined)
      setField(
        true,
        "display_order",
        Math.max(0, Number(b.display_order) || 0)
      );
    if (b.logo_media_id !== undefined)
      setField(true, "logo_media_id", b.logo_media_id);

    if (fields.length === 0)
      return c.json({ error: "No fields to update" }, 400);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    const sqlText = `UPDATE public.payment_methods SET ${fields.join(", ")}
    WHERE id = $${i} AND gateway_id = $${i + 1}
    RETURNING id, gateway_id, name, slug, description, is_enabled, settings, display_order, logo_media_id, created_at, updated_at`;
    try {
      const rows = await (sql as any).unsafe(
        sqlText,
        values.concat([methodId, id])
      );
      return c.json({ ok: true, item: rows[0] });
    } catch (e: any) {
      const detail = String(e?.message || e || "DB error");
      if (detail.includes("payment_methods_gateway_id_slug_key"))
        return c.json({ error: "Slug already exists for this gateway" }, 409);
      return c.json({ error: "Failed to update method", detail }, 500);
    }
  }
);

// DELETE /api/admin/payments/gateways/:id/methods/:methodId
payments.delete(
  "/gateways/:id/methods/:methodId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const { id, methodId } = c.req.param();
    try {
      await sql`DELETE FROM public.payment_methods WHERE id = ${methodId} AND gateway_id = ${id}`;
      return c.json({ ok: true });
    } catch (e: any) {
      return c.json(
        { error: "Failed to delete method", detail: String(e?.message || e) },
        500
      );
    }
  }
);

// POST /api/admin/payments/env-status - check presence of env vars
payments.post("/env-status", adminMiddleware as any, async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const vars = Array.isArray(body?.vars)
    ? body.vars.filter((v: any) => typeof v === "string" && v.length > 0)
    : [];
  if (vars.length === 0) return c.json({ error: "Invalid body" }, 400);
  const statuses = vars.map((name: string) => ({
    name,
    present: Boolean((c as any).env?.[name]),
  }));
  return c.json({ statuses });
});

export default payments;

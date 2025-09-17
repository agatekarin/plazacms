import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const zones = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/shipping/zones - list zones with aggregates
zones.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(
    1,
    parseInt(url.searchParams.get("limit") || "20", 10)
  );
  const status = (url.searchParams.get("status") || "").trim();
  const search = (url.searchParams.get("search") || "").trim();

  const where: string[] = [];
  const params: any[] = [];
  if (status && status !== "all") {
    params.push(status);
    where.push(`sz.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(sz.name ILIKE $${params.length} OR sz.code ILIKE $${params.length} OR sz.description ILIKE $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(*)::int AS total FROM public.shipping_zones sz ${whereSql}`;
  const [{ total }] = await (sql as any).unsafe(countSql, params);

  const offset = (page - 1) * limit;
  const listSql = `
    SELECT 
      sz.*,
      COUNT(DISTINCT szc.country_code) AS countries_count,
      COUNT(DISTINCT zg.gateway_id) AS gateways_count,
      COUNT(DISTINCT sm.id) AS methods_count,
      ARRAY_AGG(DISTINCT CASE WHEN szc.country_code IS NOT NULL THEN jsonb_build_object('country_code', szc.country_code, 'country_name', szc.country_name) ELSE NULL END)
        FILTER (WHERE szc.country_code IS NOT NULL) AS countries
    FROM public.shipping_zones sz
    LEFT JOIN public.shipping_zone_countries szc ON sz.id = szc.zone_id
    LEFT JOIN public.zone_gateways zg ON sz.id = zg.zone_id
    LEFT JOIN public.shipping_methods sm ON sz.id = sm.zone_id
    ${whereSql}
    GROUP BY sz.id
    ORDER BY sz.priority ASC, sz.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const rows = await (sql as any).unsafe(
    listSql,
    params.concat([limit, offset])
  );

  const zones = rows.map((z: any) => ({
    ...z,
    countries: z.countries || [],
    countries_count: Number(z.countries_count || 0),
    gateways_count: Number(z.gateways_count || 0),
    methods_count: Number(z.methods_count || 0),
  }));

  const totalPages = Math.ceil(total / limit);
  return c.json({
    zones,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

// POST /api/admin/shipping/zones - create zone with countries
zones.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = (await c.req.json().catch(() => ({}))) as any;
  const { code, name, description, priority, status, countries } = body || {};
  if (!code || !name)
    return c.json({ error: "Code and name are required" }, 400);

  const dup =
    await sql`SELECT id FROM public.shipping_zones WHERE code = ${String(
      code
    ).toUpperCase()}`;
  if (dup.length > 0) return c.json({ error: "Zone code already exists" }, 400);

  // No transactions on Hyperdrive; best-effort sequential inserts
  const [zone] = await sql`
    INSERT INTO public.shipping_zones (code, name, description, priority, status)
    VALUES (${String(code).toUpperCase()}, ${name}, ${description || ""}, ${
    priority || 1
  }, ${status || "active"})
    RETURNING *`;

  if (Array.isArray(countries) && countries.length) {
    for (const ct of countries) {
      await sql`
        INSERT INTO public.shipping_zone_countries (zone_id, country_code, country_name)
        VALUES (${zone.id}, ${ct.country_code}, ${ct.country_name})
        ON CONFLICT (zone_id, country_code) DO NOTHING`;
    }
  }

  return c.json({ zone, message: "Shipping zone created successfully" }, 201);
});

// GET /api/admin/shipping/zones/:id - detail with related
zones.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const zoneRows = await (sql as any).unsafe(
    `
    SELECT sz.*, COUNT(DISTINCT szc.country_code) AS countries_count, COUNT(DISTINCT zg.gateway_id) AS gateways_count, COUNT(DISTINCT sm.id) AS methods_count
    FROM public.shipping_zones sz
    LEFT JOIN public.shipping_zone_countries szc ON sz.id = szc.zone_id
    LEFT JOIN public.zone_gateways zg ON sz.id = zg.zone_id AND zg.is_available = true
    LEFT JOIN public.shipping_methods sm ON sz.id = sm.zone_id AND sm.status = 'active'
    WHERE sz.id = $1
    GROUP BY sz.id`,
    [id]
  );
  if (!zoneRows[0]) return c.json({ error: "Shipping zone not found" }, 404);
  const countries =
    await sql`SELECT country_code, country_name FROM public.shipping_zone_countries WHERE zone_id = ${id} ORDER BY country_name`;
  const gateways = await (sql as any).unsafe(
    `
    SELECT zg.*, sg.name AS gateway_name, sg.code AS gateway_code, sg.type AS gateway_type, sg.status AS gateway_status
    FROM public.zone_gateways zg JOIN public.shipping_gateways sg ON zg.gateway_id = sg.id
    WHERE zg.zone_id = $1 ORDER BY zg.priority ASC, sg.name ASC`,
    [id]
  );
  const methods = await (sql as any).unsafe(
    `
    SELECT sm.*, sg.name AS gateway_name, sg.code AS gateway_code
    FROM public.shipping_methods sm JOIN public.shipping_gateways sg ON sm.gateway_id = sg.id
    WHERE sm.zone_id = $1 ORDER BY sm.sort_order ASC, sm.name ASC`,
    [id]
  );
  const z = zoneRows[0];
  return c.json({
    zone: {
      ...z,
      countries_count: Number(z.countries_count || 0),
      gateways_count: Number(z.gateways_count || 0),
      methods_count: Number(z.methods_count || 0),
    },
    countries,
    gateways,
    methods,
  });
});

// PUT /api/admin/shipping/zones/:id - update zone + countries
zones.put("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as any;
  const { code, name, description, priority, status, countries } = body || {};
  if (!code || !name)
    return c.json({ error: "Code and name are required" }, 400);

  const exist =
    await sql`SELECT id FROM public.shipping_zones WHERE id = ${id}`;
  if (!exist[0]) return c.json({ error: "Shipping zone not found" }, 404);
  const dup =
    await sql`SELECT id FROM public.shipping_zones WHERE code = ${String(
      code
    ).toUpperCase()} AND id <> ${id}`;
  if (dup[0]) return c.json({ error: "Zone code already exists" }, 400);

  const [updated] = await sql`
    UPDATE public.shipping_zones
    SET code = ${String(code).toUpperCase()}, name = ${name}, description = ${
    description || ""
  }, priority = ${priority || 1}, status = ${
    status || "active"
  }, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *`;

  await sql`DELETE FROM public.shipping_zone_countries WHERE zone_id = ${id}`;
  if (Array.isArray(countries) && countries.length) {
    for (const ct of countries) {
      await sql`INSERT INTO public.shipping_zone_countries (zone_id, country_code, country_name) VALUES (${id}, ${ct.country_code}, ${ct.country_name})`;
    }
  }
  return c.json({
    zone: updated,
    message: "Shipping zone updated successfully",
  });
});

// DELETE /api/admin/shipping/zones/:id
zones.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const usage = await (sql as any).unsafe(
    `
    SELECT 
      (SELECT COUNT(*)::int FROM public.shipping_methods WHERE zone_id = $1) AS methods_count,
      (SELECT COUNT(*)::int FROM public.zone_gateways WHERE zone_id = $1) AS gateways_count`,
    [id]
  );
  const u = usage[0] || { methods_count: 0, gateways_count: 0 };
  if (Number(u.methods_count) > 0 || Number(u.gateways_count) > 0) {
    return c.json(
      {
        error: "Cannot delete zone that has methods or gateways assigned",
        details: u,
      },
      400
    );
  }
  await sql`DELETE FROM public.shipping_zones WHERE id = ${id}`;
  return c.json({ message: "Shipping zone deleted successfully" });
});

export default zones;

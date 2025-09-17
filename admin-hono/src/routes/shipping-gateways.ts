import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const gateways = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/shipping/gateways - list with filters/pagination
gateways.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(
    1,
    parseInt(url.searchParams.get("limit") || "20", 10)
  );
  const type = (url.searchParams.get("type") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const search = (url.searchParams.get("search") || "").trim();

  const where: string[] = [];
  const params: any[] = [];
  if (type && type !== "all") {
    params.push(type);
    where.push(`sg.type = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    where.push(`sg.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(sg.name ILIKE $${params.length} OR sg.code ILIKE $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(*)::int AS total FROM public.shipping_gateways sg ${whereSql}`;
  const [{ total }] = await (sql as any).unsafe(countSql, params);

  const offset = (page - 1) * limit;
  const listSql = `
    SELECT 
      sg.*,
      COUNT(DISTINCT zg.zone_id) as zones_count,
      COUNT(DISTINCT sm.id) as methods_count,
      ARRAY_AGG(DISTINCT 
        CASE WHEN sz.code IS NOT NULL 
        THEN jsonb_build_object(
          'zone_id', sz.id,
          'zone_code', sz.code,
          'zone_name', sz.name,
          'is_available', zg.is_available,
          'priority', zg.priority
        ) ELSE NULL END
      ) FILTER (WHERE sz.code IS NOT NULL) as zones
    FROM public.shipping_gateways sg
    LEFT JOIN public.zone_gateways zg ON sg.id = zg.gateway_id
    LEFT JOIN public.shipping_zones sz ON zg.zone_id = sz.id
    LEFT JOIN public.shipping_methods sm ON sg.id = sm.gateway_id
    ${whereSql}
    GROUP BY sg.id
    ORDER BY sg.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const rows = await (sql as any).unsafe(
    listSql,
    params.concat([limit, offset])
  );
  const gateways = rows.map((g: any) => ({
    ...g,
    zones: g.zones || [],
    zones_count: Number(g.zones_count || 0),
    methods_count: Number(g.methods_count || 0),
  }));
  const totalPages = Math.ceil(total / limit);
  return c.json({
    gateways,
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

// POST /api/admin/shipping/gateways - create
gateways.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const b = (await c.req.json().catch(() => ({}))) as any;
  const {
    code,
    name,
    type,
    logo_url,
    tracking_url_template,
    api_config,
    status,
    zones,
  } = b || {};
  if (!code || !name)
    return c.json({ error: "Code and name are required" }, 400);
  if (!["manual", "api", "hybrid"].includes(String(type)))
    return c.json({ error: "Type must be manual, api, or hybrid" }, 400);

  const dup =
    await sql`SELECT id FROM public.shipping_gateways WHERE code = ${String(
      code
    ).toUpperCase()}`;
  if (dup[0]) return c.json({ error: "Gateway code already exists" }, 400);

  const [gw] = await (sql as any).unsafe(
    `INSERT INTO public.shipping_gateways (code, name, type, logo_url, tracking_url_template, api_config, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      String(code).toUpperCase(),
      name,
      type,
      logo_url || "",
      tracking_url_template || "",
      api_config || {},
      status || "active",
    ]
  );

  if (Array.isArray(zones) && zones.length) {
    for (const z of zones) {
      await (sql as any).unsafe(
        `INSERT INTO public.zone_gateways (zone_id, gateway_id, is_available, priority)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (zone_id, gateway_id) DO UPDATE SET is_available = EXCLUDED.is_available, priority = EXCLUDED.priority`,
        [z.zone_id, gw.id, z.is_available !== false, z.priority || 1]
      );
    }
  }
  return c.json(
    { gateway: gw, message: "Shipping gateway created successfully" },
    201
  );
});

// GET /api/admin/shipping/gateways/:id - detail
gateways.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const gRows = await (sql as any).unsafe(
    `SELECT sg.*, COUNT(DISTINCT zg.zone_id) as zones_count, COUNT(DISTINCT sm.id) as methods_count
     FROM public.shipping_gateways sg
     LEFT JOIN public.zone_gateways zg ON sg.id = zg.gateway_id
     LEFT JOIN public.shipping_methods sm ON sg.id = sm.gateway_id AND sm.status = 'active'
     WHERE sg.id = $1 GROUP BY sg.id`,
    [id]
  );
  if (!gRows[0]) return c.json({ error: "Shipping gateway not found" }, 404);
  const zones = await (sql as any).unsafe(
    `SELECT zg.*, sz.code as zone_code, sz.name as zone_name, sz.status as zone_status
     FROM public.zone_gateways zg JOIN public.shipping_zones sz ON zg.zone_id = sz.id
     WHERE zg.gateway_id = $1 ORDER BY zg.priority ASC, sz.name ASC`,
    [id]
  );
  const methods = await (sql as any).unsafe(
    `SELECT sm.*, sz.code as zone_code, sz.name as zone_name
     FROM public.shipping_methods sm JOIN public.shipping_zones sz ON sm.zone_id = sz.id
     WHERE sm.gateway_id = $1 ORDER BY sz.name ASC, sm.sort_order ASC, sm.name ASC`,
    [id]
  );
  const g = gRows[0];
  return c.json({
    gateway: {
      ...g,
      zones_count: Number(g.zones_count || 0),
      methods_count: Number(g.methods_count || 0),
    },
    zones,
    methods,
  });
});

// PUT /api/admin/shipping/gateways/:id - update + zones
gateways.put("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const b = (await c.req.json().catch(() => ({}))) as any;
  const {
    code,
    name,
    type,
    logo_url,
    tracking_url_template,
    api_config,
    status,
    zones,
  } = b || {};
  if (!code || !name)
    return c.json({ error: "Code and name are required" }, 400);
  if (!["manual", "api", "hybrid"].includes(String(type)))
    return c.json({ error: "Type must be manual, api, or hybrid" }, 400);

  const exist =
    await sql`SELECT id FROM public.shipping_gateways WHERE id = ${id}`;
  if (!exist[0]) return c.json({ error: "Shipping gateway not found" }, 404);
  const dup =
    await sql`SELECT id FROM public.shipping_gateways WHERE code = ${String(
      code
    ).toUpperCase()} AND id <> ${id}`;
  if (dup[0]) return c.json({ error: "Gateway code already exists" }, 400);

  const [gw] = await (sql as any).unsafe(
    `UPDATE public.shipping_gateways SET code=$1,name=$2,type=$3,logo_url=$4,tracking_url_template=$5,api_config=$6,status=$7,updated_at=CURRENT_TIMESTAMP WHERE id=$8 RETURNING *`,
    [
      String(code).toUpperCase(),
      name,
      type,
      logo_url || "",
      tracking_url_template || "",
      api_config || {},
      status || "active",
      id,
    ]
  );

  if (zones !== undefined) {
    await sql`DELETE FROM public.zone_gateways WHERE gateway_id = ${id}`;
    if (Array.isArray(zones) && zones.length) {
      for (const z of zones) {
        await (sql as any).unsafe(
          `INSERT INTO public.zone_gateways (zone_id, gateway_id, is_available, priority) VALUES ($1,$2,$3,$4)`,
          [z.zone_id, id, z.is_available !== false, z.priority || 1]
        );
      }
    }
  }
  return c.json({
    gateway: gw,
    message: "Shipping gateway updated successfully",
  });
});

// DELETE /api/admin/shipping/gateways/:id
gateways.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const usage = await (sql as any).unsafe(
    `SELECT 
       (SELECT COUNT(*) FROM public.shipping_methods WHERE gateway_id = $1) as methods_count,
       (SELECT COUNT(*) FROM public.zone_gateways WHERE gateway_id = $1) as zones_count`,
    [id]
  );
  const mCount = parseInt((usage[0]?.methods_count as any) || "0", 10);
  if (mCount > 0)
    return c.json(
      {
        error: "Cannot delete gateway that has shipping methods",
        details: usage[0],
      },
      400
    );

  await sql`DELETE FROM public.zone_gateways WHERE gateway_id = ${id}`;
  await sql`DELETE FROM public.shipping_gateways WHERE id = ${id}`;
  return c.json({ message: "Shipping gateway deleted successfully" });
});

export default gateways;

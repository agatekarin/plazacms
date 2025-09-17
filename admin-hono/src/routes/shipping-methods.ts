import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const methods = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/shipping/methods - list with filters/pagination
methods.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(
    1,
    parseInt(url.searchParams.get("limit") || "20", 10)
  );
  const zone_id = (url.searchParams.get("zone_id") || "").trim();
  const gateway_id = (url.searchParams.get("gateway_id") || "").trim();
  const method_type = (url.searchParams.get("method_type") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const currency = (url.searchParams.get("currency") || "").trim();
  const search = (url.searchParams.get("search") || "").trim();

  const where: string[] = [];
  const params: any[] = [];
  if (zone_id && zone_id !== "all") {
    params.push(zone_id);
    where.push(`sm.zone_id = $${params.length}`);
  }
  if (gateway_id && gateway_id !== "all") {
    params.push(gateway_id);
    where.push(`sm.gateway_id = $${params.length}`);
  }
  if (method_type && method_type !== "all") {
    params.push(method_type);
    where.push(`sm.method_type = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    where.push(`sm.status = $${params.length}`);
  }
  if (currency && currency !== "all") {
    params.push(currency);
    where.push(`sm.currency = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(sm.name ILIKE $${params.length} OR sm.description ILIKE $${params.length} OR sz.name ILIKE $${params.length} OR sg.name ILIKE $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countSql = `SELECT COUNT(*)::int AS total FROM public.shipping_methods sm JOIN public.shipping_zones sz ON sm.zone_id = sz.id JOIN public.shipping_gateways sg ON sm.gateway_id = sg.id ${whereSql}`;
  const [{ total }] = await (sql as any).unsafe(countSql, params);

  const offset = (page - 1) * limit;
  const listSql = `
    SELECT 
      sm.id,
      sm.zone_id,
      sm.gateway_id,
      sm.name,
      sm.method_type,
      CAST(sm.base_cost AS FLOAT) as base_cost,
      sm.currency,
      sm.weight_unit,
      sm.weight_threshold,
      CAST(sm.cost_per_kg AS FLOAT) as cost_per_kg,
      CAST(sm.min_free_threshold AS FLOAT) as min_free_threshold,
      sm.max_free_weight,
      sm.max_weight_limit,
      sm.max_dimensions,
      sm.restricted_items,
      sm.description,
      sm.estimated_days_min,
      sm.estimated_days_max,
      sm.sort_order,
      sm.status,
      sm.created_at,
      sm.updated_at,
      sz.name as zone_name,
      sz.code as zone_code,
      sz.priority as zone_priority,
      sg.name as gateway_name,
      sg.code as gateway_code,
      sg.type as gateway_type
    FROM public.shipping_methods sm
    JOIN public.shipping_zones sz ON sm.zone_id = sz.id
    JOIN public.shipping_gateways sg ON sm.gateway_id = sg.id
    ${whereSql}
    ORDER BY sz.priority ASC, sm.sort_order ASC, sm.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const rows = await (sql as any).unsafe(
    listSql,
    params.concat([limit, offset])
  );

  const totalPages = Math.ceil(total / limit);
  return c.json({
    methods: rows,
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

// POST /api/admin/shipping/methods - create
methods.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const b = (await c.req.json().catch(() => ({}))) as any;
  const {
    zone_id,
    gateway_id,
    name,
    method_type,
    base_cost,
    currency,
    weight_unit,
    weight_threshold,
    cost_per_kg,
    min_free_threshold,
    max_free_weight,
    max_weight_limit,
    max_dimensions,
    restricted_items,
    description,
    estimated_days_min,
    estimated_days_max,
    status,
    sort_order,
  } = b || {};

  if (!zone_id || !gateway_id || !name || !method_type) {
    return c.json(
      { error: "Zone, gateway, name, and method type are required" },
      400
    );
  }
  if (
    !["flat", "weight_based", "free_shipping", "percentage"].includes(
      String(method_type)
    )
  ) {
    return c.json({ error: "Invalid method type" }, 400);
  }

  const compat =
    await sql`SELECT is_available FROM public.zone_gateways WHERE zone_id = ${zone_id} AND gateway_id = ${gateway_id}`;
  if (!compat[0])
    return c.json({ error: "Gateway is not available for this zone" }, 400);
  if (compat[0].is_available === false)
    return c.json({ error: "Gateway is disabled for this zone" }, 400);

  const dup =
    await sql`SELECT id FROM public.shipping_methods WHERE zone_id = ${zone_id} AND gateway_id = ${gateway_id} AND name = ${name}`;
  if (dup[0])
    return c.json(
      { error: "Method name already exists for this zone-gateway combination" },
      400
    );

  const [ins] = await (sql as any).unsafe(
    `INSERT INTO public.shipping_methods (
      zone_id, gateway_id, name, method_type, base_cost, currency,
      weight_unit, weight_threshold, cost_per_kg, min_free_threshold, max_free_weight,
      max_weight_limit, max_dimensions, restricted_items, description,
      estimated_days_min, estimated_days_max, status, sort_order
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    ) RETURNING *`,
    [
      zone_id,
      gateway_id,
      name,
      method_type,
      Number(base_cost || 0),
      currency || "USD",
      weight_unit || "g",
      Number(weight_threshold || 1000),
      Number(cost_per_kg || 0),
      Number(min_free_threshold || 0),
      Number(max_free_weight || 0),
      Number(max_weight_limit || 30000),
      JSON.stringify(max_dimensions || {}),
      JSON.stringify(restricted_items || []),
      description || "",
      Number(estimated_days_min || 1),
      Number(estimated_days_max || 7),
      status || "active",
      Number(sort_order || 0),
    ]
  );

  return c.json(
    { method: ins, message: "Shipping method created successfully" },
    201
  );
});

// PATCH /api/admin/shipping/methods/:id - toggle/update basic fields
methods.patch("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const b = (await c.req.json().catch(() => ({}))) as any;
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  const setF = (cond: boolean, k: string, v: any) => {
    if (!cond) return;
    fields.push(`${k} = $${i++}`);
    values.push(v);
  };
  if (b.status !== undefined) setF(true, "status", String(b.status));
  if (b.sort_order !== undefined)
    setF(true, "sort_order", Number(b.sort_order));
  if (b.name !== undefined) setF(true, "name", String(b.name));
  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  const sqlText = `UPDATE public.shipping_methods SET ${fields.join(
    ", "
  )} WHERE id = $${i} RETURNING *`;
  const rows = await (sql as any).unsafe(sqlText, values.concat(id));
  return c.json({ method: rows[0] });
});

// DELETE /api/admin/shipping/methods/:id
methods.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  await sql`DELETE FROM public.shipping_methods WHERE id = ${id}`;
  return c.json({ ok: true });
});

export default methods;

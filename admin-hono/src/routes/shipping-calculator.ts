import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

type AppEnv = {
  Bindings: Env;
  Variables: { user: any };
};

const calc = new Hono<AppEnv>();

// GET /api/admin/shipping/calculator - coverage by country
calc.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    // Countries with any active methods via zones/gateways
    const rows = await (sql as any).unsafe(
      `SELECT DISTINCT ON (szc.country_code)
         szc.country_code,
         szc.country_name,
         sz.code AS zone_code,
         sz.name AS zone_name,
         COALESCE(mcnt.methods_count, 0)::int AS methods_count
       FROM public.shipping_zone_countries szc
       JOIN public.shipping_zones sz ON sz.id = szc.zone_id AND sz.status = 'active'
       LEFT JOIN (
         SELECT sm.zone_id, COUNT(*) AS methods_count
         FROM public.shipping_methods sm
         WHERE sm.status = 'active'
         GROUP BY sm.zone_id
       ) mcnt ON mcnt.zone_id = sz.id
       ORDER BY szc.country_code, sz.priority ASC`
    );
    return c.json({ countries: rows });
  } catch (e: any) {
    return c.json(
      { error: "Failed to load coverage", detail: String(e?.message || e) },
      500
    );
  }
});

// POST /api/admin/shipping/calculator - compute methods for input
calc.post("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
    const country_code = String(body.country_code || "")
      .trim()
      .toUpperCase();
    const cart_total = Number(body.cart_total || 0);
    const total_weight_g = Number(body.total_weight_g || 0);
    if (!country_code || cart_total <= 0 || total_weight_g <= 0) {
      return c.json({ error: "Invalid input" }, 400);
    }

    // Find zone for country
    const zoneRows = await (sql as any).unsafe(
      `SELECT sz.* FROM public.shipping_zone_countries szc
       JOIN public.shipping_zones sz ON sz.id = szc.zone_id AND sz.status = 'active'
       WHERE TRIM(UPPER(szc.country_code)) = $1
       ORDER BY sz.priority ASC LIMIT 1`,
      [country_code]
    );
    if (!zoneRows[0])
      return c.json({
        country_code,
        cart_total,
        total_weight_g,
        methods: [],
        cheapest_method: null,
        summary: [],
        total_methods_found: 0,
      });

    const zone = zoneRows[0];

    // Active methods for zone
    const methods = await (sql as any).unsafe(
      `SELECT sm.*, sg.name as gateway_name, sg.code as gateway_code, sg.type as gateway_type
       FROM public.shipping_methods sm
       JOIN public.shipping_gateways sg ON sm.gateway_id = sg.id
       WHERE sm.zone_id = $1 AND sm.status = 'active'
       ORDER BY sm.sort_order ASC, sm.created_at DESC`,
      [zone.id]
    );

    // Compute cost per method
    const computed = (methods as any[]).map((m) => {
      let cost = Number(m.base_cost || 0);
      if (m.method_type === "weight_based") {
        const threshold = Number(m.weight_threshold || 0);
        const extraPerKg = Number(m.cost_per_kg || 0);
        const over = Math.max(0, total_weight_g - threshold);
        // convert grams to kg
        const overKg = over / 1000;
        cost += overKg * extraPerKg;
      }
      if (
        m.method_type === "free_shipping" ||
        (m.min_free_threshold && cart_total >= Number(m.min_free_threshold))
      ) {
        cost = 0;
      }
      return {
        id: m.id,
        name: m.name,
        method_type: m.method_type,
        currency: m.currency || "USD",
        calculated_cost: cost,
        estimated_days_min: m.estimated_days_min || 1,
        estimated_days_max: m.estimated_days_max || 7,
        zone: {
          id: zone.id,
          name: zone.name,
          code: zone.code,
          priority: zone.priority,
        },
        gateway: {
          id: m.gateway_id,
          name: m.gateway_name,
          code: m.gateway_code,
          type: m.gateway_type,
        },
      };
    });

    // Summary
    const byCurrency = new Map<
      string,
      {
        methods_count: number;
        cheapest_cost: number;
        most_expensive_cost: number;
        free_shipping_available: boolean;
      }
    >();
    for (const m of computed) {
      const entry = byCurrency.get(m.currency) || {
        methods_count: 0,
        cheapest_cost: Number.POSITIVE_INFINITY,
        most_expensive_cost: 0,
        free_shipping_available: false,
      };
      entry.methods_count += 1;
      entry.cheapest_cost = Math.min(entry.cheapest_cost, m.calculated_cost);
      entry.most_expensive_cost = Math.max(
        entry.most_expensive_cost,
        m.calculated_cost
      );
      if (m.calculated_cost === 0) entry.free_shipping_available = true;
      byCurrency.set(m.currency, entry);
    }

    const cheapest = computed.reduce(
      (acc, cur) =>
        acc && acc.calculated_cost <= cur.calculated_cost ? acc : cur,
      computed[0]
    );

    return c.json({
      country_code,
      cart_total,
      total_weight_g,
      methods: computed,
      cheapest_method: computed.length ? cheapest : null,
      summary: Array.from(byCurrency.entries()).map(([currency, v]) => ({
        currency,
        ...v,
      })),
      total_methods_found: computed.length,
    });
  } catch (e: any) {
    return c.json(
      { error: "Failed to calculate", detail: String(e?.message || e) },
      500
    );
  }
});

export default calc;

import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

type AppEnv = { Bindings: Env; Variables: { user: any } };

const summary = new Hono<AppEnv>();

// GET /api/admin/shipping/summary - aggregated shipping stats
summary.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);

    const counts = await (sql as any).unsafe(`
      SELECT
        (SELECT COUNT(*) FROM public.shipping_zones)                           AS zones,
        (SELECT COUNT(*) FROM public.shipping_zones WHERE status = 'active')   AS zones_active,
        (SELECT COUNT(*) FROM public.shipping_gateways)                        AS gateways,
        (SELECT COUNT(*) FROM public.shipping_gateways WHERE status = 'active')AS gateways_active,
        (SELECT COUNT(*) FROM public.shipping_gateways WHERE type = 'manual')  AS gateways_manual,
        (SELECT COUNT(*) FROM public.shipping_gateways WHERE type = 'api')     AS gateways_api,
        (SELECT COUNT(*) FROM public.shipping_gateways WHERE type = 'hybrid')  AS gateways_hybrid,
        (SELECT COUNT(*) FROM public.shipping_methods)                         AS methods,
        (SELECT COUNT(*) FROM public.shipping_methods WHERE status = 'active') AS methods_active,
        (SELECT COUNT(*) FROM public.shipping_methods WHERE method_type = 'flat')          AS methods_flat,
        (SELECT COUNT(*) FROM public.shipping_methods WHERE method_type = 'weight_based')  AS methods_weight_based,
        (SELECT COUNT(*) FROM public.shipping_methods WHERE method_type = 'free_shipping') AS methods_free_shipping,
        (SELECT COUNT(*) FROM public.shipping_methods WHERE method_type = 'percentage')    AS methods_percentage,
        (SELECT COUNT(DISTINCT country_code) FROM public.shipping_zone_countries)          AS countries_covered
    `);

    const row = counts?.[0] || {};

    return c.json({
      totals: {
        zones: Number(row.zones || 0),
        zones_active: Number(row.zones_active || 0),
        gateways: Number(row.gateways || 0),
        gateways_active: Number(row.gateways_active || 0),
        methods: Number(row.methods || 0),
        methods_active: Number(row.methods_active || 0),
        countries_covered: Number(row.countries_covered || 0),
      },
      by_gateway_type: {
        manual: Number(row.gateways_manual || 0),
        api: Number(row.gateways_api || 0),
        hybrid: Number(row.gateways_hybrid || 0),
      },
      by_method_type: {
        flat: Number(row.methods_flat || 0),
        weight_based: Number(row.methods_weight_based || 0),
        free_shipping: Number(row.methods_free_shipping || 0),
        percentage: Number(row.methods_percentage || 0),
      },
    });
  } catch (e: any) {
    return c.json(
      {
        error: "Failed to load shipping summary",
        detail: String(e?.message || e),
      },
      500
    );
  }
});

export default summary;

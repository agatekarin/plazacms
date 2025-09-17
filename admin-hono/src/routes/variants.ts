import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const variants = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/variants/:id - fetch single variant with product and primary image
variants.get("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { id } = c.req.param();
    if (!id) return c.json({ error: "Missing id" }, 400);

    const rows = await (sql as any).unsafe(
      `SELECT v.id, v.sku, v.stock, v.status,
              v.regular_price, v.sale_price,
              p.id AS product_id, p.name AS product_name, p.slug AS product_slug,
              i.file_url AS image_url
         FROM public.product_variants v
         JOIN public.products p ON p.id = v.product_id
         LEFT JOIN LATERAL (
           SELECT m.file_url
             FROM public.product_variant_images pvi
             JOIN public.media m ON m.id = pvi.media_id
            WHERE pvi.product_variant_id = v.id
            ORDER BY pvi.display_order ASC
            LIMIT 1
         ) i ON true
        WHERE v.id = $1
        LIMIT 1`,
      [id]
    );

    if (!rows?.[0]) return c.json({ error: "Not found" }, 404);
    return c.json({ item: rows[0] });
  } catch (e: any) {
    return c.json(
      { error: "Failed to fetch variant", detail: String(e?.message || e) },
      500
    );
  }
});

export default variants;

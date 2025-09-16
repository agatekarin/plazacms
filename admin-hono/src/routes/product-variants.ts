import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const variants = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/products/:id/variants
variants.get("/:id/variants", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  if (!productId) return c.json({ error: "Missing id" }, 400);

  const rows = await sql`
    SELECT v.id, v.sku, v.stock, v.status, (v.weight::int) AS weight, v.regular_price, v.sale_price, v.sale_start_date, v.sale_end_date, v.created_at,
           COALESCE(json_agg(json_build_object('id', pav.id, 'attribute_id', pav.attribute_id, 'value', pav.value)
             ORDER BY pav.value) FILTER (WHERE pav.id IS NOT NULL), '[]') AS attributes,
           i.file_url AS image_url, i.media_id AS image_id
      FROM public.product_variants v
      LEFT JOIN LATERAL (
        SELECT m.file_url, m.id AS media_id
          FROM public.product_variant_images pvi
          JOIN public.media m ON m.id = pvi.media_id
         WHERE pvi.product_variant_id = v.id
         ORDER BY pvi.display_order ASC
         LIMIT 1
      ) i ON true
      LEFT JOIN public.product_variant_attribute_values vv ON vv.product_variant_id = v.id
      LEFT JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
     WHERE v.product_id = ${productId}
     GROUP BY v.id, v.sale_start_date, v.sale_end_date, v.weight, i.file_url, i.media_id
     ORDER BY v.created_at DESC
  `;
  return c.json({ items: rows });
});

// POST /api/admin/products/:id/variants
const createSchema = z.object({
  attribute_value_ids: z.array(z.string().uuid()).min(1),
  sku: z.string().nullable().optional(),
  regular_price: z.number().nullable().optional(),
  sale_price: z.number().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  status: z
    .enum(["published", "private", "draft", "archived"])
    .default("draft"),
});

variants.post("/:id/variants", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  if (!productId) return c.json({ error: "Missing id" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);
  const b = parsed.data;

  try {
    await sql.begin(async (trx) => {
      const existRows = await trx`
        SELECT v.id, ARRAY_AGG(pav.id ORDER BY pav.id) AS vals
          FROM public.product_variants v
          LEFT JOIN public.product_variant_attribute_values vv ON vv.product_variant_id = v.id
          LEFT JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
         WHERE v.product_id = ${productId}
         GROUP BY v.id
      `;
      const incoming = [...b.attribute_value_ids].sort();
      for (const r of existRows as any[]) {
        const arr = (r.vals || []) as string[];
        if (
          arr.length === incoming.length &&
          arr.every((x, i) => x === incoming[i])
        ) {
          throw new Error("Variant with the same attributes already exists");
        }
      }

      const varRows = await trx`
        INSERT INTO public.product_variants (product_id, sku, stock, status, regular_price, sale_price)
        VALUES (${productId}, ${b.sku ?? null}, ${b.stock}, ${b.status}, ${
        b.regular_price ?? null
      }, ${b.sale_price ?? null})
        RETURNING id, sku, stock, status, regular_price, sale_price, created_at
      `;
      const variantId = (varRows[0] as any).id as string;

      for (const avId of b.attribute_value_ids) {
        await trx`
          INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id)
          VALUES (${variantId}, ${avId})
        `;
      }
      c.header("x-created-variant-id", variantId);
      return;
    });
    return c.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("product_variants_sku_key"))
      return c.json({ error: "SKU already exists" }, 409);
    if (msg.includes("Variant with the same attributes already exists"))
      return c.json({ error: msg }, 409);
    return c.json({ error: "Failed to create variant", detail: msg }, 500);
  }
});

// POST /api/admin/products/:id/variants/generate
variants.post("/:id/variants/generate", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  if (!productId) return c.json({ error: "Missing id" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const selections: string[][] = Array.isArray((body as any)?.selections)
    ? (body as any).selections
    : [];
  if (
    !selections.length ||
    selections.some((arr) => !Array.isArray(arr) || arr.length === 0)
  ) {
    return c.json(
      { error: "selections must be non-empty arrays of attribute_value_id" },
      400
    );
  }

  const combos: string[][] = selections.reduce<string[][]>((acc, arr) => {
    if (acc.length === 0) return arr.map((v) => [v]);
    const next: string[][] = [];
    for (const prev of acc) for (const v of arr) next.push([...prev, v]);
    return next;
  }, []);

  try {
    await sql.begin(async (trx) => {
      for (const attributes of combos) {
        // Check if variant with same attributes already exists
        const sortedAttrs = attributes.sort();
        const exists = await trx`
          SELECT v.id
            FROM public.product_variants v
            JOIN public.product_variant_attribute_values vv ON vv.product_variant_id = v.id
           WHERE v.product_id = ${productId}
           GROUP BY v.id
          HAVING ARRAY_AGG(vv.attribute_value_id ORDER BY vv.attribute_value_id) = ${sortedAttrs}::uuid[]
        `;
        if ((exists as any[]).length) continue;

        const inserted = await trx`
          INSERT INTO public.product_variants (product_id, status, stock)
          VALUES (${productId}, 'draft', 0)
          RETURNING id
        `;
        const variantId = (inserted[0] as any).id as string;
        for (const av of attributes) {
          await trx`
            INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id)
            VALUES (${variantId}, ${av}) ON CONFLICT DO NOTHING
          `;
        }
      }
    });
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json(
      {
        error: "Failed to generate variants",
        detail: String(e?.message || e || "DB error"),
      },
      500
    );
  }
});

// PATCH /api/admin/products/:id/variants/:variantId
variants.patch(
  "/:id/variants/:variantId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const id = c.req.param("id");
    const variantId = c.req.param("variantId");
    if (!id || !variantId)
      return c.json({ error: "Missing id or variantId" }, 400);
    const body = await c.req
      .json()
      .catch(() => ({} as Record<string, unknown>));
    const allowed = new Set([
      "sku",
      "stock",
      "status",
      "weight",
      "regular_price",
      "sale_price",
      "sale_start_date",
      "sale_end_date",
    ]);
    const updates: Record<string, any> = {};
    for (const [key, rawVal] of Object.entries(body)) {
      if (!allowed.has(key)) continue;
      let val: any = rawVal;
      if (["stock", "regular_price", "sale_price", "weight"].includes(key)) {
        if (val === null || val === undefined || val === "") val = 0;
        val = Number(val);
        if (Number.isNaN(val))
          return c.json({ error: `${key} must be a number` }, 400);
        if (key === "weight") val = Math.max(0, Math.floor(val));
      }
      if (["sale_start_date", "sale_end_date"].includes(key) && val)
        val = new Date(val);
      if (
        key === "status" &&
        !["published", "private", "draft", "archived"].includes(val)
      )
        return c.json({ error: "invalid status" }, 400);
      updates[key] = val;
    }
    if (!Object.keys(updates).length)
      return c.json({ error: "No updatable fields provided" }, 400);

    // Add updated timestamp
    updates.updated_at = new Date();

    const rows = await sql`
    UPDATE public.product_variants
       SET ${sql(updates)}
     WHERE id = ${variantId} AND product_id = ${id}
     RETURNING id, sku, stock, status, (weight::int) AS weight, regular_price, sale_price, sale_start_date, sale_end_date, updated_at
  `;
    return c.json({ ok: true, item: rows[0] });
  }
);

// DELETE /api/admin/products/:id/variants/:variantId
variants.delete(
  "/:id/variants/:variantId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const id = c.req.param("id");
    const variantId = c.req.param("variantId");
    if (!id || !variantId)
      return c.json({ error: "Missing id or variantId" }, 400);
    await sql`DELETE FROM public.product_variants WHERE id = ${variantId} AND product_id = ${id}`;
    return c.json({ ok: true });
  }
);

// POST /api/admin/products/:id/variants/bulk
variants.post("/:id/variants/bulk", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing id" }, 400);
  const body = await c.req.json().catch(() => ({}));
  const variant_ids: string[] | undefined = Array.isArray(
    (body as any)?.variant_ids
  )
    ? (body as any).variant_ids
    : undefined;
  const action: string = (body as any)?.action || "";
  const value: number | null =
    typeof (body as any)?.value === "number" ? (body as any).value : null;
  const percent: number | null =
    typeof (body as any)?.percent === "number" ? (body as any).percent : null;
  const status: string | null =
    typeof (body as any)?.status === "string" ? (body as any).status : null;

  const whereIds =
    variant_ids && variant_ids.length
      ? sql`AND id = ANY(${variant_ids}::uuid[])`
      : sql``;

  let query;
  if (action === "set_regular_prices" && value !== null) {
    query = sql`UPDATE public.product_variants SET regular_price = ${value} WHERE product_id = ${id} ${whereIds}`;
  } else if (action === "increase_regular_prices" && percent !== null) {
    query = sql`UPDATE public.product_variants SET regular_price = COALESCE(regular_price,0) * (1 + ${percent} / 100.0) WHERE product_id = ${id} ${whereIds}`;
  } else if (action === "decrease_regular_prices" && percent !== null) {
    query = sql`UPDATE public.product_variants SET regular_price = COALESCE(regular_price,0) * (1 - ${percent} / 100.0) WHERE product_id = ${id} ${whereIds}`;
  } else if (action === "set_sale_prices" && value !== null) {
    query = sql`UPDATE public.product_variants SET sale_price = ${value} WHERE product_id = ${id} ${whereIds}`;
  } else if (action === "set_stock_quantities" && value !== null) {
    query = sql`UPDATE public.product_variants SET stock = ${Math.max(
      0,
      value
    )} WHERE product_id = ${id} ${whereIds}`;
  } else if (action === "set_weights" && value !== null) {
    query = sql`UPDATE public.product_variants SET weight = ${Math.max(
      0,
      Math.floor(value)
    )} WHERE product_id = ${id} ${whereIds}`;
  } else if (
    action === "set_status" &&
    status &&
    ["published", "private", "draft", "archived"].includes(status)
  ) {
    query = sql`UPDATE public.product_variants SET status = ${status} WHERE product_id = ${id} ${whereIds}`;
  } else {
    return c.json({ error: "Unsupported or invalid action" }, 400);
  }

  const res = await query;
  const updated = Array.isArray(res) ? res.length : (res as any)?.count ?? 0;
  return c.json({ ok: true, updated });
});

// GET /api/admin/products/:id/variants/:variantId/media
variants.get(
  "/:id/variants/:variantId/media",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const productId = c.req.param("id");
    const variantId = c.req.param("variantId");
    if (!productId || !variantId)
      return c.json({ error: "Missing id or variantId" }, 400);

    const rows = await sql`
    SELECT pvi.media_id, pvi.display_order, m.file_url, m.filename
    FROM public.product_variant_images pvi
    JOIN public.media m ON m.id = pvi.media_id
    WHERE pvi.product_variant_id = ${variantId}
    ORDER BY pvi.display_order ASC
  `;
    return c.json({ items: rows });
  }
);

// POST /api/admin/products/:id/variants/:variantId/media
variants.post(
  "/:id/variants/:variantId/media",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const productId = c.req.param("id");
    const variantId = c.req.param("variantId");
    if (!productId || !variantId)
      return c.json({ error: "Missing id or variantId" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const media_id = body?.media_id as string | undefined;
    const display_order =
      typeof body?.display_order === "number" ? body.display_order : 0;
    if (!media_id) return c.json({ error: "media_id is required" }, 400);

    try {
      await sql`
      INSERT INTO public.product_variant_images (product_variant_id, media_id, display_order)
      VALUES (${variantId}, ${media_id}, ${display_order})
      ON CONFLICT (product_variant_id, media_id) DO UPDATE SET display_order = EXCLUDED.display_order
    `;
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json(
        { error: "Failed to add image", detail: err?.message || "DB error" },
        500
      );
    }
  }
);

// DELETE /api/admin/products/:id/variants/:variantId/media/:mediaId
variants.delete(
  "/:id/variants/:variantId/media/:mediaId",
  adminMiddleware as any,
  async (c) => {
    const sql = getDb(c as any);
    const productId = c.req.param("id");
    const variantId = c.req.param("variantId");
    const mediaId = c.req.param("mediaId");
    if (!productId || !variantId || !mediaId)
      return c.json({ error: "Missing id, variantId or mediaId" }, 400);

    try {
      await sql`
      DELETE FROM public.product_variant_images 
      WHERE product_variant_id = ${variantId} AND media_id = ${mediaId}
    `;
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json(
        { error: "Failed to remove image", detail: err?.message || "DB error" },
        500
      );
    }
  }
);

export default variants;

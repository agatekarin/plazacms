import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const products = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Helpers
const sortMap: Record<string, string> = {
  created_asc: "p.created_at ASC",
  created_desc: "p.created_at DESC",
  name_asc: "p.name ASC",
  name_desc: "p.name DESC",
  price_asc: "p.regular_price ASC",
  price_desc: "p.regular_price DESC",
  stock_asc: "p.stock ASC",
  stock_desc: "p.stock DESC",
};

// GET /api/admin/products
products.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);

  const url = new URL(c.req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const filter = url.searchParams.get("filter") || "all";
  const sort = url.searchParams.get("sort") || "created_desc";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (q) {
    const like = `%${q}%`;
    conditions.push(sql`(p.name ILIKE ${like} OR p.slug ILIKE ${like})`);
  }
  if (filter === "on_sale") {
    conditions.push(
      sql`(p.sale_price IS NOT NULL AND (p.sale_start_date IS NULL OR p.sale_start_date <= NOW()) AND (p.sale_end_date IS NULL OR p.sale_end_date >= NOW()))`
    );
  } else if (filter === "out_of_stock") {
    conditions.push(sql`(p.stock <= 0)`);
  } else if (filter.startsWith("status:")) {
    const val = filter.split(":")[1];
    if (val) conditions.push(sql`(p.status = ${val})`);
  }

  // Build WHERE clause manually since sql.join not available
  let whereSql = sql``;
  if (conditions.length === 1) {
    whereSql = sql`WHERE ${conditions[0]}`;
  } else if (conditions.length === 2) {
    whereSql = sql`WHERE ${conditions[0]} AND ${conditions[1]}`;
  } else if (conditions.length === 3) {
    whereSql = sql`WHERE ${conditions[0]} AND ${conditions[1]} AND ${conditions[2]}`;
  } else if (conditions.length > 3) {
    // For more conditions, we need to build it step by step
    whereSql = sql`WHERE ${conditions[0]}`;
    for (let i = 1; i < conditions.length; i++) {
      whereSql = sql`${whereSql} AND ${conditions[i]}`;
    }
  }
  const orderBy = sortMap[sort] || sortMap["created_desc"];

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM public.products p
    ${whereSql}
  `;

  const items = await sql`
    SELECT p.id, p.name, p.slug, p.sku, p.status, p.stock, p.regular_price, p.currency, p.created_at,
           c.name AS category_name, p.featured_image_id,
           m.file_url AS featured_image_url, m.filename AS featured_image_filename
      FROM public.products p
      LEFT JOIN public.categories c ON c.id = p.category_id
      LEFT JOIN public.media m ON m.id = p.featured_image_id
      ${whereSql}
      ORDER BY ${sql.unsafe(orderBy)}
      LIMIT ${pageSize} OFFSET ${offset}
  `;

  return c.json({ items, total: count || 0, page, pageSize });
});

// POST /api/admin/products
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  regular_price: z.number(),
  currency: z.string().min(1).default("USD"),
  stock: z.number().int().nonnegative().default(0),
  category_id: z.string().uuid().optional().nullable(),
  status: z
    .enum(["published", "private", "draft", "archived"])
    .default("draft"),
  sku: z.string().optional().nullable(),
  weight: z.number().int().nonnegative().default(0),
  sale_price: z.number().optional().nullable(),
  sale_start_date: z.union([z.string(), z.date()]).optional().nullable(),
  sale_end_date: z.union([z.string(), z.date()]).optional().nullable(),
  tax_class_id: z.string().uuid().optional().nullable(),
  product_type: z.enum(["simple", "variable"]).default("simple"),
  featured_image_id: z.string().uuid().optional().nullable(),
});

products.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);
  const b = parsed.data;

  const rows = await sql`
    INSERT INTO public.products (
      name, slug, description, regular_price, currency, stock,
      category_id, vendor_id, status, weight, sku, sale_price, sale_start_date, sale_end_date, tax_class_id, product_type, featured_image_id
    ) VALUES (
      ${b.name}, ${b.slug}, ${b.description ?? null}, ${b.regular_price}, ${
    b.currency
  }, ${b.stock},
      ${b.category_id ?? null}, ${null}, ${b.status}, ${b.weight}, ${
    b.sku ?? null
  }, ${b.sale_price ?? null},
      ${b.sale_start_date ? new Date(b.sale_start_date as any) : null},
      ${b.sale_end_date ? new Date(b.sale_end_date as any) : null},
      ${b.tax_class_id ?? null}, ${b.product_type}, ${
    b.featured_image_id ?? null
  }
    )
    RETURNING id, name, slug, sku, status, stock, regular_price, currency, created_at, product_type, featured_image_id
  `;

  return c.json({ ok: true, item: rows[0] }, 201);
});

// GET /api/admin/products/:id
products.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing id" }, 400);

  const rows = await sql`
    SELECT p.id, p.name, p.slug, p.description, p.regular_price, p.currency, p.stock, p.category_id, p.status, p.sku,
           (p.weight::int) AS weight, p.sale_price, p.sale_start_date, p.sale_end_date, p.tax_class_id, p.featured_image_id,
           CASE WHEN EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id)
                THEN 'variable' ELSE 'simple' END as product_type
      FROM public.products p
      WHERE p.id = ${id}
  `;
  const item = rows?.[0];
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json({ item });
});

// PATCH /api/admin/products/:id
products.patch("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing id" }, 400);
  const body = await c.req.json().catch(() => ({} as Record<string, unknown>));

  const allowed = new Set([
    "name",
    "slug",
    "description",
    "regular_price",
    "currency",
    "stock",
    "category_id",
    "status",
    "sku",
    "weight",
    "sale_price",
    "sale_start_date",
    "sale_end_date",
    "tax_class_id",
    "product_type",
    "featured_image_id",
  ]);

  const updates: Record<string, any> = {};
  for (const [key, rawVal] of Object.entries(body)) {
    if (!allowed.has(key)) continue;
    let val: any = rawVal;
    if (["regular_price", "stock", "weight", "sale_price"].includes(key)) {
      if (val === null || val === undefined || val === "") val = 0;
      val = Number(val);
      if (Number.isNaN(val))
        return c.json({ error: `${key} must be a number` }, 400);
      if (key === "weight") val = Math.max(0, Math.floor(val));
    }
    if (["sale_start_date", "sale_end_date"].includes(key) && val) {
      val = new Date(val);
    }
    // key is from whitelist -> safe as identifier
    updates[key] = val;
  }
  if (!Object.keys(updates).length)
    return c.json({ error: "No updatable fields provided" }, 400);

  // Add updated timestamp
  updates.updated_at = new Date();

  const rows = await sql`
    UPDATE public.products
       SET ${sql(updates)}
     WHERE id = ${id}
     RETURNING id, name, slug, sku, status, stock, (weight::int) AS weight, regular_price, currency, category_id, tax_class_id, updated_at
  `;

  return c.json({ ok: true, item: rows[0] });
});

// DELETE /api/admin/products/:id
products.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing id" }, 400);
  await sql`DELETE FROM public.products WHERE id = ${id}`;
  return c.json({ ok: true });
});

export default products;

import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const productExport = new Hono();

productExport.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { searchParams } = new URL(c.req.url);
    const q = searchParams.get("q") || "";
    const filter = searchParams.get("filter") || "all";
    const sort = searchParams.get("sort") || "created_desc";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";

    // Build WHERE conditions
    const conditions: any[] = [];

    if (q) {
      const searchTerm = `%${q}%`;
      conditions.push(
        sql`(p.name ILIKE ${searchTerm} OR p.slug ILIKE ${searchTerm})`
      );
    }

    if (filter === "on_sale") {
      conditions.push(
        sql`p.sale_price IS NOT NULL AND (p.sale_start_date IS NULL OR p.sale_start_date <= NOW()) AND (p.sale_end_date IS NULL OR p.sale_end_date >= NOW())`
      );
    } else if (filter === "out_of_stock") {
      conditions.push(sql`p.stock <= 0`);
    } else if (filter === "published") {
      conditions.push(sql`p.status = 'published'`);
    } else if (filter === "draft") {
      conditions.push(sql`p.status = 'draft'`);
    }

    if (category) {
      conditions.push(sql`c.name ILIKE ${category}`);
    }

    if (status) {
      conditions.push(sql`p.status = ${status}`);
    }

    // Build WHERE clause
    let whereSql = sql``;
    if (conditions.length === 1) {
      whereSql = sql`WHERE ${conditions[0]}`;
    } else if (conditions.length === 2) {
      whereSql = sql`WHERE ${conditions[0]} AND ${conditions[1]}`;
    } else if (conditions.length === 3) {
      whereSql = sql`WHERE ${conditions[0]} AND ${conditions[1]} AND ${conditions[2]}`;
    } else if (conditions.length > 3) {
      whereSql = sql`WHERE ${conditions[0]}`;
      for (let i = 1; i < conditions.length; i++) {
        whereSql = sql`${whereSql} AND ${conditions[i]}`;
      }
    }

    // Build ORDER BY clause
    let orderBy = "p.created_at DESC";
    switch (sort) {
      case "created_asc":
        orderBy = "p.created_at ASC";
        break;
      case "created_desc":
        orderBy = "p.created_at DESC";
        break;
      case "name_asc":
        orderBy = "p.name ASC";
        break;
      case "name_desc":
        orderBy = "p.name DESC";
        break;
      case "price_asc":
        orderBy = "p.regular_price ASC";
        break;
      case "price_desc":
        orderBy = "p.regular_price DESC";
        break;
      case "stock_asc":
        orderBy = "p.stock ASC";
        break;
      case "stock_desc":
        orderBy = "p.stock DESC";
        break;
    }

    // Compose one-file CSV in the agreed format
    // Header
    const header = [
      "row_type",
      "product_slug",
      "name",
      "description",
      "status",
      "currency",
      "regular_price",
      "sale_price",
      "sale_start_date",
      "sale_end_date",
      "stock",
      "weight",
      "sku",
      "category_id",
      "tax_class_id",
      "featured_image_id",
      "product_images",
      "variant_sku",
      "variant_status",
      "variant_stock",
      "variant_weight",
      "variant_regular_price",
      "variant_sale_price",
      "variant_sale_start_date",
      "variant_sale_end_date",
      "variant_attributes",
      "variant_images",
    ];

    // Fetch products list (base)
    const productsRes = await sql`
      SELECT p.id, p.slug, p.name, p.description, p.status, p.currency,
             p.regular_price, p.sale_price, p.sale_start_date, p.sale_end_date,
             p.stock, p.weight, p.sku, p.category_id, p.tax_class_id, p.featured_image_id,
             p.product_type
      FROM public.products p
      ${whereSql}
      ORDER BY ${(sql as any).unsafe(orderBy)}
    `;

    const productIds = productsRes.map((r: any) => r.id);
    const imagesByProduct = new Map<string, string[]>();
    const variantsByProduct = new Map<string, any[]>();
    const variantImagesByVariant = new Map<string, string[]>();
    const attrsByVariant = new Map<string, string[]>();

    if (productIds.length) {
      // product images
      const imgRes = await sql`
        SELECT pi.product_id, pi.media_id
        FROM public.product_images pi
        WHERE pi.product_id = ANY(${productIds}::uuid[])
        ORDER BY pi.product_id, pi.display_order ASC
      `;
      for (const r of imgRes) {
        const arr = imagesByProduct.get(r.product_id) || [];
        arr.push(r.media_id);
        imagesByProduct.set(r.product_id, arr);
      }

      // variants
      const vRes = await sql`
        SELECT v.id, v.product_id, v.sku, v.status, v.stock, v.weight,
               v.regular_price, v.sale_price, v.sale_start_date, v.sale_end_date
        FROM public.product_variants v
        WHERE v.product_id = ANY(${productIds}::uuid[])
        ORDER BY v.created_at ASC
      `;
      for (const r of vRes) {
        const arr = variantsByProduct.get(r.product_id) || [];
        arr.push(r);
        variantsByProduct.set(r.product_id, arr);
      }

      const vIds = vRes.map((r: any) => r.id);
      if (vIds.length) {
        // variant images
        const viRes = await sql`
          SELECT product_variant_id, media_id
          FROM public.product_variant_images
          WHERE product_variant_id = ANY(${vIds}::uuid[])
          ORDER BY product_variant_id, display_order ASC
        `;
        for (const r of viRes) {
          const arr = variantImagesByVariant.get(r.product_variant_id) || [];
          arr.push(r.media_id);
          variantImagesByVariant.set(r.product_variant_id, arr);
        }

        // variant attributes
        const vaRes = await sql`
          SELECT vv.product_variant_id, pa.name AS attribute_name, pav.value AS attribute_value
          FROM public.product_variant_attribute_values vv
          JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
          JOIN public.product_attributes pa ON pa.id = pav.attribute_id
          WHERE vv.product_variant_id = ANY(${vIds}::uuid[])
          ORDER BY pa.name ASC
        `;
        for (const r of vaRes) {
          const key = r.product_variant_id;
          const pair = `${r.attribute_name}=${r.attribute_value}`;
          const arr = attrsByVariant.get(key) || [];
          arr.push(pair);
          attrsByVariant.set(key, arr);
        }
      }
    }

    const lines: string[] = [];
    lines.push(header.join(","));

    const quote = (s: string | null | undefined) => {
      const v = s ?? "";
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };

    for (const p of productsRes) {
      const productImages = (imagesByProduct.get(p.id) || []).join("|");
      // product row
      lines.push(
        [
          "product",
          p.slug,
          quote(p.name),
          quote(p.description || ""),
          p.status,
          p.currency,
          p.regular_price ?? 0,
          p.sale_price ?? "",
          p.sale_start_date ? new Date(p.sale_start_date).toISOString() : "",
          p.sale_end_date ? new Date(p.sale_end_date).toISOString() : "",
          p.stock ?? 0,
          p.weight ?? 0,
          p.sku || "",
          p.category_id || "",
          p.tax_class_id || "",
          p.featured_image_id || "",
          productImages,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ].join(",")
      );

      // variants rows
      const vs = variantsByProduct.get(p.id) || [];
      for (const v of vs) {
        const vimgs = (variantImagesByVariant.get(v.id) || []).join("|");
        const vattrs = (attrsByVariant.get(v.id) || []).join("|");
        lines.push(
          [
            "variant",
            p.slug,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            v.sku || "",
            v.status || "draft",
            v.stock ?? 0,
            v.weight ?? 0,
            v.regular_price ?? "",
            v.sale_price ?? "",
            v.sale_start_date ? new Date(v.sale_start_date).toISOString() : "",
            v.sale_end_date ? new Date(v.sale_end_date).toISOString() : "",
            quote(vattrs),
            vimgs,
          ].join(",")
        );
      }
    }

    const csvContent = lines.join("\n");
    const today = new Date().toISOString().split("T")[0];

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="products-${today}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return c.json(
      { error: "Failed to export products", detail: error?.message },
      500
    );
  }
});

export default productExport;

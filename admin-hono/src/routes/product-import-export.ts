import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const productImportExportRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// =====================================================
// PRODUCT IMPORT/EXPORT API ROUTES
// =====================================================

type ImportMode = "create" | "update" | "upsert";

// Simple CSV parser that supports quotes and commas/newlines
function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      current.push(field.trim());
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      // handle CRLF
      if (i > 0 && text[i - 1] === "\r") {
        // ignore CR
      }
      current.push(field.trim());
      rows.push(current);
      current = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field || current.length) {
    current.push(field.trim());
    rows.push(current);
  }
  return { header: rows[0] || [], rows: rows.slice(1) };
}

function idx(header: string[], name: string): number {
  return header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
}

// GET /api/admin/products/import-export/stats - Get import/export statistics
productImportExportRoutes.get(
  "/import-export/stats",
  adminMiddleware,
  async (c) => {
    try {
      const sql = getDb(c);

      // Get total products count
      const totalQuery = `
      SELECT COUNT(*)::int as total_products
      FROM public.products
    `;
      const totalResult = await sql.unsafe(totalQuery, []);
      const totalProducts = totalResult[0]?.total_products || 0;

      // Get published products count
      const publishedQuery = `
      SELECT COUNT(*)::int as published_products
      FROM public.products
      WHERE status = 'published'
    `;
      const publishedResult = await sql.unsafe(publishedQuery, []);
      const publishedProducts = publishedResult[0]?.published_products || 0;

      // Get draft products count
      const draftQuery = `
      SELECT COUNT(*)::int as draft_products
      FROM public.products
      WHERE status = 'draft'
    `;
      const draftResult = await sql.unsafe(draftQuery, []);
      const draftProducts = draftResult[0]?.draft_products || 0;

      // Get products with images count
      const withImagesQuery = `
      SELECT COUNT(DISTINCT p.id)::int as products_with_images
      FROM public.products p
      INNER JOIN public.product_images pi ON p.id = pi.product_id
    `;
      const withImagesResult = await sql.unsafe(withImagesQuery, []);
      const productsWithImages = withImagesResult[0]?.products_with_images || 0;

      // Get products with variants count
      const withVariantsQuery = `
      SELECT COUNT(DISTINCT p.id)::int as products_with_variants
      FROM public.products p
      INNER JOIN public.product_variants pv ON p.id = pv.product_id
    `;
      const withVariantsResult = await sql.unsafe(withVariantsQuery, []);
      const productsWithVariants =
        withVariantsResult[0]?.products_with_variants || 0;

      // Get total variants count
      const totalVariantsQuery = `
      SELECT COUNT(*)::int as total_variants
      FROM public.product_variants
    `;
      const totalVariantsResult = await sql.unsafe(totalVariantsQuery, []);
      const totalVariants = totalVariantsResult[0]?.total_variants || 0;

      // Get out of stock products count
      const outOfStockQuery = `
      SELECT COUNT(*)::int as out_of_stock_products
      FROM public.products
      WHERE stock <= 0
    `;
      const outOfStockResult = await sql.unsafe(outOfStockQuery, []);
      const outOfStockProducts =
        outOfStockResult[0]?.out_of_stock_products || 0;

      // Get products on sale count
      const onSaleQuery = `
      SELECT COUNT(*)::int as on_sale_products
      FROM public.products
      WHERE sale_price IS NOT NULL 
        AND (sale_start_date IS NULL OR sale_start_date <= NOW()) 
        AND (sale_end_date IS NULL OR sale_end_date >= NOW())
    `;
      const onSaleResult = await sql.unsafe(onSaleQuery, []);
      const onSaleProducts = onSaleResult[0]?.on_sale_products || 0;

      // Get average product price
      const avgPriceQuery = `
      SELECT COALESCE(AVG(regular_price), 0)::float as average_price
      FROM public.products
      WHERE regular_price > 0
    `;
      const avgPriceResult = await sql.unsafe(avgPriceQuery, []);
      const averagePrice = avgPriceResult[0]?.average_price || 0;

      // Get categories count
      const categoriesQuery = `
      SELECT COUNT(DISTINCT category_id)::int as categories_count
      FROM public.products
      WHERE category_id IS NOT NULL
    `;
      const categoriesResult = await sql.unsafe(categoriesQuery, []);
      const categoriesCount = categoriesResult[0]?.categories_count || 0;

      // TODO: Add last_export_date and last_import_date tracking
      // For now, return mock data
      return c.json({
        total_products: totalProducts,
        published_products: publishedProducts,
        draft_products: draftProducts,
        products_with_images: productsWithImages,
        products_with_variants: productsWithVariants,
        total_variants: totalVariants,
        out_of_stock_products: outOfStockProducts,
        on_sale_products: onSaleProducts,
        average_price: averagePrice,
        categories_count: categoriesCount,
        last_export_date: null,
        last_import_date: null,
      });
    } catch (error) {
      console.error("Error fetching product import/export stats:", error);
      return c.json({ error: "Failed to fetch stats" }, 500);
    }
  }
);

// GET /api/admin/products/import-export/export - Export products to CSV
productImportExportRoutes.get(
  "/import-export/export",
  adminMiddleware,
  async (c) => {
    try {
      const sql = getDb(c);
      const { searchParams } = new URL(c.req.url);
      const q = searchParams.get("q") || "";
      const filter = searchParams.get("filter") || "all";
      const sort = searchParams.get("sort") || "created_desc";
      const category = searchParams.get("category") || "";
      const status = searchParams.get("status") || "";

      // Build WHERE clause
      const where: string[] = [];
      const params: any[] = [];

      if (q) {
        params.push(`%${q}%`, `%${q}%`);
        where.push(
          `(p.name ILIKE $${params.length - 1} OR p.slug ILIKE $${
            params.length
          })`
        );
      }

      if (filter === "on_sale") {
        where.push(
          "p.sale_price IS NOT NULL AND (p.sale_start_date IS NULL OR p.sale_start_date <= NOW()) AND (p.sale_end_date IS NULL OR p.sale_end_date >= NOW())"
        );
      } else if (filter === "out_of_stock") {
        where.push("p.stock <= 0");
      } else if (filter === "published") {
        where.push("p.status = 'published'");
      } else if (filter === "draft") {
        where.push("p.status = 'draft'");
      }

      if (category) {
        params.push(category);
        where.push(`c.name ILIKE $${params.length}`);
      }

      if (status) {
        params.push(status);
        where.push(`p.status = $${params.length}`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

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

      // CSV header
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

      // Fetch products
      const productsQuery = `
        SELECT p.id, p.slug, p.name, p.description, p.status, p.currency,
               p.regular_price, p.sale_price, p.sale_start_date, p.sale_end_date,
               p.stock, p.weight, p.sku, p.category_id, p.tax_class_id, p.featured_image_id,
               p.product_type
        FROM public.products p
        ${whereSql}
        ORDER BY ${orderBy}
      `;

      const productsResult = await sql.unsafe(productsQuery, params);
      const products = productsResult;

      const productIds = products.map((r: any) => r.id);
      const imagesByProduct = new Map<string, string[]>();
      const variantsByProduct = new Map<string, any[]>();
      const variantImagesByVariant = new Map<string, string[]>();
      const attrsByVariant = new Map<string, string[]>();

      if (productIds.length) {
        // Get product images
        const imgQuery = `
          SELECT pi.product_id, pi.media_id
          FROM public.product_images pi
          WHERE pi.product_id = ANY($1::uuid[])
          ORDER BY pi.product_id, pi.display_order ASC
        `;
        const imgResult = await sql.unsafe(imgQuery, [productIds]);
        for (const r of imgResult) {
          const arr = imagesByProduct.get(r.product_id) || [];
          arr.push(r.media_id);
          imagesByProduct.set(r.product_id, arr);
        }

        // Get variants
        const vQuery = `
          SELECT v.id, v.product_id, v.sku, v.status, v.stock, v.weight,
                 v.regular_price, v.sale_price, v.sale_start_date, v.sale_end_date
          FROM public.product_variants v
          WHERE v.product_id = ANY($1::uuid[])
          ORDER BY v.created_at ASC
        `;
        const vResult = await sql.unsafe(vQuery, [productIds]);
        for (const r of vResult) {
          const arr = variantsByProduct.get(r.product_id) || [];
          arr.push(r);
          variantsByProduct.set(r.product_id, arr);
        }

        const vIds = vResult.map((r: any) => r.id);
        if (vIds.length) {
          // Get variant images
          const viQuery = `
            SELECT product_variant_id, media_id
            FROM public.product_variant_images
            WHERE product_variant_id = ANY($1::uuid[])
            ORDER BY product_variant_id, display_order ASC
          `;
          const viResult = await sql.unsafe(viQuery, [vIds]);
          for (const r of viResult) {
            const arr = variantImagesByVariant.get(r.product_variant_id) || [];
            arr.push(r.media_id);
            variantImagesByVariant.set(r.product_variant_id, arr);
          }

          // Get variant attributes
          const vaQuery = `
            SELECT vv.product_variant_id, pa.name AS attribute_name, pav.value AS attribute_value
            FROM public.product_variant_attribute_values vv
            JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
            JOIN public.product_attributes pa ON pa.id = pav.attribute_id
            WHERE vv.product_variant_id = ANY($1::uuid[])
            ORDER BY pa.name ASC
          `;
          const vaResult = await sql.unsafe(vaQuery, [vIds]);
          for (const r of vaResult) {
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

      for (const p of products) {
        const productImages = (imagesByProduct.get(p.id) || []).join("|");
        // Product row
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

        // Variant rows
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
              v.sale_start_date
                ? new Date(v.sale_start_date).toISOString()
                : "",
              v.sale_end_date ? new Date(v.sale_end_date).toISOString() : "",
              quote(vattrs),
              vimgs,
            ].join(",")
          );
        }
      }

      const csvContent = lines.join("\n");
      const filename = `products-${new Date().toISOString().split("T")[0]}.csv`;

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      console.error("Error exporting products:", error);
      return c.json({ error: "Failed to export products" }, 500);
    }
  }
);

// POST /api/admin/products/import-export/import - Import products from CSV
productImportExportRoutes.post(
  "/import-export/import",
  adminMiddleware,
  async (c) => {
    try {
      const sql = getDb(c);
      const { searchParams } = new URL(c.req.url);
      const mode = (searchParams.get("mode") as ImportMode) || "upsert";
      const dryRun = searchParams.get("dry_run") === "1";

      let csvText = "";
      const contentType = c.req.header("content-type") || "";

      if (contentType.includes("multipart/form-data")) {
        const form = await c.req.formData();
        const file = form.get("file");
        if (!file || typeof file === "string") {
          return c.json({ error: "Missing file" }, 400);
        }
        csvText = await (file as File).text();
      } else {
        csvText = await c.req.text();
      }

      if (!csvText || !csvText.trim()) {
        return c.json({ error: "Empty CSV" }, 400);
      }

      const { header, rows } = parseCsv(csvText);
      const required = [
        "row_type",
        "product_slug",
        "name",
        "status",
        "currency",
        "regular_price",
        "stock",
        "variant_sku",
        "variant_attributes",
      ];
      const missing = required.filter((k) => idx(header, k) === -1);
      if (missing.length) {
        return c.json({ error: `Missing columns: ${missing.join(", ")}` }, 400);
      }

      type PendingProduct = {
        slug: string;
        row: string[];
        variantRows: string[][];
      };
      const map = new Map<string, PendingProduct>();
      for (const r of rows) {
        if (r.length === 0 || r.every((c) => c === "")) continue;
        const type = (r[idx(header, "row_type")] || "").toLowerCase();
        const slug = r[idx(header, "product_slug")]?.trim();
        if (!slug) continue;
        if (!map.has(slug)) map.set(slug, { slug, row: [], variantRows: [] });
        const group = map.get(slug)!;
        if (type === "product") group.row = r;
        else if (type === "variant") group.variantRows.push(r);
      }

      const errors: Array<{ product_slug: string; message: string }> = [];
      const result = {
        createdProducts: 0,
        updatedProducts: 0,
        createdVariants: 0,
        updatedVariants: 0,
        errors,
      };

      if (dryRun) {
        // Basic validation only
        for (const [slug, g] of map) {
          if (!g.row.length) {
            errors.push({ product_slug: slug, message: "Missing product row" });
          }
        }
        return c.json({ ok: true, ...result });
      }

      // Process import in transaction
      await sql.begin(async (trx) => {
        for (const [slug, g] of map) {
          if (!g.row.length) {
            errors.push({ product_slug: slug, message: "Missing product row" });
            continue;
          }

          try {
            const r = g.row;
            const name = r[idx(header, "name")]?.trim();
            const description = r[idx(header, "description")]?.trim() || "";
            const status = r[idx(header, "status")] || "draft";
            const currency = r[idx(header, "currency")] || "USD";
            const regularPrice = parseFloat(
              r[idx(header, "regular_price")] || "0"
            );
            const salePrice = r[idx(header, "sale_price")]
              ? parseFloat(r[idx(header, "sale_price")])
              : null;
            const stock = parseInt(r[idx(header, "stock")] || "0");
            const weight = parseFloat(r[idx(header, "weight")] || "0");
            const sku = r[idx(header, "sku")]?.trim() || "";
            const categoryId = r[idx(header, "category_id")]?.trim() || null;
            const taxClassId = r[idx(header, "tax_class_id")]?.trim() || null;
            const featuredImageId =
              r[idx(header, "featured_image_id")]?.trim() || null;
            const productImages =
              r[idx(header, "product_images")]?.split("|").filter(Boolean) ||
              [];

            if (!name) {
              errors.push({
                product_slug: slug,
                message: "Missing product name",
              });
              continue;
            }

            // Check if product exists
            const existingProduct = await trx`
              SELECT id FROM public.products WHERE slug = ${slug}
            `;

            let productId: string;
            if (existingProduct.length > 0) {
              if (mode === "create") {
                errors.push({
                  product_slug: slug,
                  message: "Product already exists (create mode)",
                });
                continue;
              }
              // Update existing product
              productId = existingProduct[0].id;
              await trx`
                UPDATE public.products 
                SET name = ${name}, description = ${description}, status = ${status}, 
                    currency = ${currency}, regular_price = ${regularPrice}, 
                    sale_price = ${salePrice}, stock = ${stock}, weight = ${weight},
                    sku = ${sku}, category_id = ${categoryId}::uuid, 
                    tax_class_id = ${taxClassId}::uuid, 
                    featured_image_id = ${featuredImageId}::uuid,
                    updated_at = NOW()
                WHERE id = ${productId}
              `;
              result.updatedProducts++;
            } else {
              if (mode === "update") {
                errors.push({
                  product_slug: slug,
                  message: "Product not found (update mode)",
                });
                continue;
              }
              // Create new product
              const newProduct = await trx`
                INSERT INTO public.products (slug, name, description, status, currency, 
                                           regular_price, sale_price, stock, weight, sku, 
                                           category_id, tax_class_id, featured_image_id)
                VALUES (${slug}, ${name}, ${description}, ${status}, ${currency}, 
                        ${regularPrice}, ${salePrice}, ${stock}, ${weight}, ${sku}, 
                        ${categoryId}::uuid, ${taxClassId}::uuid, ${featuredImageId}::uuid)
                RETURNING id
              `;
              productId = newProduct[0].id;
              result.createdProducts++;
            }

            // Handle product images
            if (productImages.length > 0) {
              await trx`DELETE FROM public.product_images WHERE product_id = ${productId}`;
              for (let i = 0; i < productImages.length; i++) {
                await trx`
                  INSERT INTO public.product_images (product_id, media_id, display_order)
                  VALUES (${productId}, ${productImages[i]}::uuid, ${i})
                `;
              }
            }

            // Handle variants
            for (const vr of g.variantRows) {
              const vsku = vr[idx(header, "variant_sku")]?.trim() || "";
              const vstatus = vr[idx(header, "variant_status")] || "draft";
              const vstock = parseInt(vr[idx(header, "variant_stock")] || "0");
              const vweight = parseFloat(
                vr[idx(header, "variant_weight")] || "0"
              );
              const vregularPrice = parseFloat(
                vr[idx(header, "variant_regular_price")] || "0"
              );
              const vsalePrice = vr[idx(header, "variant_sale_price")]
                ? parseFloat(vr[idx(header, "variant_sale_price")])
                : null;
              const vattributes =
                vr[idx(header, "variant_attributes")]
                  ?.split("|")
                  .filter(Boolean) || [];
              const vimages =
                vr[idx(header, "variant_images")]?.split("|").filter(Boolean) ||
                [];

              if (!vsku) continue;

              // Check if variant exists
              const existingVariant = await trx`
                SELECT id FROM public.product_variants WHERE product_id = ${productId} AND sku = ${vsku}
              `;

              let variantId: string;
              if (existingVariant.length > 0) {
                variantId = existingVariant[0].id;
                await trx`
                  UPDATE public.product_variants 
                  SET status = ${vstatus}, stock = ${vstock}, weight = ${vweight},
                      regular_price = ${vregularPrice}, sale_price = ${vsalePrice},
                      updated_at = NOW()
                  WHERE id = ${variantId}
                `;
                result.updatedVariants++;
              } else {
                const newVariant = await trx`
                  INSERT INTO public.product_variants (product_id, sku, status, stock, weight, regular_price, sale_price)
                  VALUES (${productId}, ${vsku}, ${vstatus}, ${vstock}, ${vweight}, ${vregularPrice}, ${vsalePrice})
                  RETURNING id
                `;
                variantId = newVariant[0].id;
                result.createdVariants++;
              }

              // Handle variant images
              if (vimages.length > 0) {
                await trx`DELETE FROM public.product_variant_images WHERE product_variant_id = ${variantId}`;
                for (let i = 0; i < vimages.length; i++) {
                  await trx`
                    INSERT INTO public.product_variant_images (product_variant_id, media_id, display_order)
                    VALUES (${variantId}, ${vimages[i]}::uuid, ${i})
                  `;
                }
              }

              // Handle variant attributes
              if (vattributes.length > 0) {
                await trx`DELETE FROM public.product_variant_attribute_values WHERE product_variant_id = ${variantId}`;
                for (const pair of vattributes) {
                  const [attrName, ...rest] = pair.split("=");
                  const attrValue = rest.join("=").trim();
                  if (!attrName || !attrValue) continue;

                  // Ensure attribute exists
                  const attr = await trx`
                    INSERT INTO public.product_attributes (name)
                    VALUES (${attrName.trim()})
                    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                  `;
                  const attributeId = attr[0].id;

                  // Ensure attribute value exists
                  const attrVal = await trx`
                    INSERT INTO public.product_attribute_values (attribute_id, value)
                    VALUES (${attributeId}, ${attrValue})
                    ON CONFLICT (attribute_id, value) DO UPDATE SET value = EXCLUDED.value
                    RETURNING id
                  `;
                  const valueId = attrVal[0].id;

                  // Link variant to attribute value
                  await trx`
                    INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id)
                    VALUES (${variantId}, ${valueId})
                    ON CONFLICT DO NOTHING
                  `;
                }
              }
            }
          } catch (error: any) {
            errors.push({ product_slug: slug, message: error.message });
          }
        }
      });

      return c.json({ ok: true, ...result });
    } catch (error: any) {
      console.error("Import failed:", error);
      return c.json({ error: "Import failed", detail: error?.message }, 500);
    }
  }
);

// GET /api/admin/products/import-export/template - Get import template CSV
productImportExportRoutes.get(
  "/import-export/template",
  adminMiddleware,
  async (c) => {
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

    const sampleRows = [
      [
        "product",
        "sample-product-1",
        "Sample Product 1",
        "This is a sample product description",
        "published",
        "USD",
        "29.99",
        "",
        "",
        "",
        "100",
        "0.5",
        "SAMPLE001",
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
      ],
      [
        "variant",
        "sample-product-1",
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
        "SAMPLE001-RED-S",
        "published",
        "50",
        "0.5",
        "29.99",
        "",
        "",
        "",
        "Color=Red|Size=Small",
        "",
      ],
    ];

    const lines: string[] = [];
    lines.push(header.join(","));
    for (const row of sampleRows) {
      lines.push(row.join(","));
    }

    const csvContent = lines.join("\n");
    const filename = "products-import-template.csv";

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }
);

export default productImportExportRoutes;

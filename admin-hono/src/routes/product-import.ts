import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

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
    if (ch === "\r") {
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // last field
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim());
    rows.push(current);
  }
  const header = rows.shift() || [];
  return { header, rows };
}

function idx(header: string[], name: string): number {
  return header.findIndex((h) => h.trim().toLowerCase() === name);
}

const productImport = new Hono();

productImport.post("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
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
      // basic validation only
      for (const [slug, g] of map) {
        if (!g.row.length) {
          errors.push({ product_slug: slug, message: "Missing product row" });
        }
        for (const v of g.variantRows) {
          const sku = v[idx(header, "variant_sku")]?.trim();
          if (!sku) {
            errors.push({ product_slug: slug, message: "Variant missing SKU" });
          }
        }
      }
      return c.json({ ok: errors.length === 0, ...result });
    }

    // Start transaction
    await sql.begin(async (trx: any) => {
      for (const [slug, g] of map) {
        // Upsert product
        const pr = g.row;
        if (!pr || pr.length === 0) {
          if (mode === "update") {
            // skip when update-only and no product row provided
            continue;
          }
        }
        const name = pr[idx(header, "name")] || null;
        const description = pr[idx(header, "description")] || null;
        const status = pr[idx(header, "status")] || "draft";
        const currency = pr[idx(header, "currency")] || "USD";
        const regular_price = Number(pr[idx(header, "regular_price")] || 0);
        const sale_price = pr[idx(header, "sale_price")] || "";
        const sale_start_date = pr[idx(header, "sale_start_date")] || null;
        const sale_end_date = pr[idx(header, "sale_end_date")] || null;
        const stock = Number(pr[idx(header, "stock")] || 0);
        const weight = Number(pr[idx(header, "weight")] || 0);
        const sku = pr[idx(header, "sku")] || null;
        const category_id = pr[idx(header, "category_id")] || null;
        const tax_class_id = pr[idx(header, "tax_class_id")] || null;
        const featured_image_id = pr[idx(header, "featured_image_id")] || null;
        const product_images = (pr[idx(header, "product_images")] || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);

        let productId: string | null = null;

        // fetch existing by slug
        const existing = await trx`
          SELECT id, product_type 
          FROM public.products 
          WHERE slug = ${slug} 
          LIMIT 1
        `;

        if (existing.length) {
          productId = existing[0].id as string;
          if (mode !== "create") {
            await trx`
              UPDATE public.products
              SET 
                name = COALESCE(${name}, name),
                description = ${description},
                status = ${status},
                currency = ${currency},
                regular_price = ${regular_price},
                sale_price = ${sale_price || null}::numeric,
                sale_start_date = ${
                  sale_start_date ? sale_start_date : null
                }::timestamptz,
                sale_end_date = ${
                  sale_end_date ? sale_end_date : null
                }::timestamptz,
                stock = ${stock},
                weight = ${weight},
                sku = ${sku},
                category_id = ${category_id ? category_id : null}::uuid,
                tax_class_id = ${tax_class_id ? tax_class_id : null}::uuid,
                featured_image_id = ${
                  featured_image_id ? featured_image_id : null
                }::uuid
              WHERE id = ${productId}
            `;
            result.updatedProducts++;
          }
        } else if (mode !== "update") {
          const ins = await trx`
            INSERT INTO public.products
            (name, slug, description, status, currency, regular_price, sale_price, sale_start_date, sale_end_date,
             stock, weight, sku, category_id, tax_class_id, product_type, featured_image_id)
            VALUES (
              ${name},
              ${slug},
              ${description},
              ${status},
              ${currency},
              ${regular_price},
              ${sale_price || null}::numeric,
              ${sale_start_date ? sale_start_date : null}::timestamptz,
              ${sale_end_date ? sale_end_date : null}::timestamptz,
              ${stock},
              ${weight},
              ${sku},
              ${category_id ? category_id : null}::uuid,
              ${tax_class_id ? tax_class_id : null}::uuid,
              ${g.variantRows.length > 0 ? "variable" : "simple"},
              ${featured_image_id ? featured_image_id : null}::uuid
            )
            RETURNING id
          `;
          productId = ins[0].id as string;
          result.createdProducts++;
        }

        if (!productId) continue;

        // Set product type based on presence of variants
        if (g.variantRows.length > 0) {
          await trx`
            UPDATE public.products 
            SET product_type = 'variable' 
            WHERE id = ${productId}
          `;
        }

        // Replace product images if provided
        if (product_images.length) {
          await trx`
            DELETE FROM public.product_images 
            WHERE product_id = ${productId}
          `;
          for (let idxImg = 0; idxImg < product_images.length; idxImg++) {
            await trx`
              INSERT INTO public.product_images (product_id, media_id, display_order)
              VALUES (${productId}, ${product_images[idxImg]}::uuid, ${idxImg})
            `;
          }
        }

        for (const v of g.variantRows) {
          const variant_sku = v[idx(header, "variant_sku")]?.trim() || null;
          const vstatus = v[idx(header, "variant_status")] || "draft";
          const vstock = Number(v[idx(header, "variant_stock")] || 0);
          const vweight = Number(v[idx(header, "variant_weight")] || 0);
          const vreg = v[idx(header, "variant_regular_price")] || "";
          const vsale = v[idx(header, "variant_sale_price")] || "";
          const vstart = v[idx(header, "variant_sale_start_date")] || "";
          const vend = v[idx(header, "variant_sale_end_date")] || "";
          const vattrs = (v[idx(header, "variant_attributes")] || "")
            .split("|")
            .map((p) => p.trim())
            .filter(Boolean);
          const vimages = (v[idx(header, "variant_images")] || "")
            .split("|")
            .map((p) => p.trim())
            .filter(Boolean);

          if (!variant_sku && mode === "update") continue;

          // Upsert variant by SKU
          let variantId: string | null = null;
          if (variant_sku) {
            const ex = await trx`
              SELECT id 
              FROM public.product_variants 
              WHERE sku = ${variant_sku} 
              LIMIT 1
            `;

            if (ex.length) {
              variantId = ex[0].id as string;
              if (mode !== "create") {
                await trx`
                  UPDATE public.product_variants
                  SET 
                    status = ${vstatus},
                    stock = ${vstock},
                    weight = ${vweight},
                    regular_price = ${vreg || null}::numeric,
                    sale_price = ${vsale || null}::numeric,
                    sale_start_date = ${vstart || null}::timestamptz,
                    sale_end_date = ${vend || null}::timestamptz
                  WHERE id = ${variantId}
                `;
                result.updatedVariants++;
              }
            } else if (mode !== "update") {
              const insv = await trx`
                INSERT INTO public.product_variants
                (product_id, sku, status, stock, weight, regular_price, sale_price, sale_start_date, sale_end_date)
                VALUES (
                  ${productId},
                  ${variant_sku},
                  ${vstatus},
                  ${vstock},
                  ${vweight},
                  ${vreg || null}::numeric,
                  ${vsale || null}::numeric,
                  ${vstart || null}::timestamptz,
                  ${vend || null}::timestamptz
                )
                RETURNING id
              `;
              variantId = insv[0].id as string;
              result.createdVariants++;
            }
          }
          if (!variantId) continue;

          // Replace variant images if provided
          if (vimages.length) {
            await trx`
              DELETE FROM public.product_variant_images 
              WHERE product_variant_id = ${variantId}
            `;
            for (let iimg = 0; iimg < vimages.length; iimg++) {
              await trx`
                INSERT INTO public.product_variant_images (product_variant_id, media_id, display_order)
                VALUES (${variantId}, ${vimages[iimg]}::uuid, ${iimg})
              `;
            }
          }

          // Attributes mapping
          if (vattrs.length) {
            // Clear and re-link
            await trx`
              DELETE FROM public.product_variant_attribute_values 
              WHERE product_variant_id = ${variantId}
            `;
            for (const pair of vattrs) {
              const [rawName, ...rest] = pair.split("=");
              const name = (rawName || "").trim();
              const value = rest.join("=").trim();
              if (!name || !value) continue;

              // ensure attribute
              const attr = await trx`
                INSERT INTO public.product_attributes (name)
                VALUES (${name})
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
              `;
              const attributeId = attr[0].id as string;

              const val = await trx`
                INSERT INTO public.product_attribute_values (attribute_id, value)
                VALUES (${attributeId}, ${value})
                ON CONFLICT (attribute_id, value) DO UPDATE SET value = EXCLUDED.value
                RETURNING id
              `;
              const valueId = val[0].id as string;

              await trx`
                INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id)
                VALUES (${variantId}, ${valueId})
                ON CONFLICT DO NOTHING
              `;
            }
          }
        }
      }
    });

    return c.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("Import failed", e);
    return c.json({ error: "Import failed", detail: e?.message }, 500);
  }
});

export default productImport;

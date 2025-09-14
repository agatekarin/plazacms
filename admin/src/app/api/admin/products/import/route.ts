// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev instead

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PUT() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PATCH() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

/*
ORIGINAL CODE COMMENTED OUT:
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") as ImportMode) || "upsert";
    const dryRun = searchParams.get("dry_run") === "1";

    let csvText = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }
      csvText = await (file as File).text();
    } else {
      csvText = await req.text();
    }
    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
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
      return NextResponse.json(
        { error: `Missing columns: ${missing.join(", ")}` },
        { status: 400 }
      );
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
      return NextResponse.json({ ok: errors.length === 0, ...result });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

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
        const existing = await client.query(
          "SELECT id, product_type FROM public.products WHERE slug = $1 LIMIT 1",
          [slug]
        );
        if (existing.rows.length) {
          productId = existing.rows[0].id as string;
          if (mode !== "create") {
            await client.query(
              `UPDATE public.products
               SET name = COALESCE($2,name), description = $3, status = $4, currency = $5,
                   regular_price = $6, sale_price = $7::numeric, sale_start_date = NULLIF($8,'')::timestamptz,
                   sale_end_date = NULLIF($9,'')::timestamptz, stock = $10, weight = $11, sku = $12,
                   category_id = NULLIF($13,'')::uuid, tax_class_id = NULLIF($14,'')::uuid,
                   featured_image_id = NULLIF($15,'')::uuid
               WHERE id = $1`,
              [
                productId,
                name,
                description,
                status,
                currency,
                regular_price,
                sale_price || null,
                sale_start_date,
                sale_end_date,
                stock,
                weight,
                sku,
                category_id,
                tax_class_id,
                featured_image_id,
              ]
            );
            result.updatedProducts++;
          }
        } else if (mode !== "update") {
          const ins = await client.query(
            `INSERT INTO public.products
             (name, slug, description, status, currency, regular_price, sale_price, sale_start_date, sale_end_date,
              stock, weight, sku, category_id, tax_class_id, product_type, featured_image_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7::numeric,NULLIF($8,'')::timestamptz,NULLIF($9,'')::timestamptz,
                     $10,$11,$12,NULLIF($13,'')::uuid,NULLIF($14,'')::uuid,$15,NULLIF($16,'')::uuid)
             RETURNING id`,
            [
              name,
              slug,
              description,
              status,
              currency,
              regular_price,
              sale_price || null,
              sale_start_date,
              sale_end_date,
              stock,
              weight,
              sku,
              category_id,
              tax_class_id,
              g.variantRows.length > 0 ? "variable" : "simple",
              featured_image_id,
            ]
          );
          productId = ins.rows[0].id as string;
          result.createdProducts++;
        }

        if (!productId) continue;

        // Set product type based on presence of variants
        if (g.variantRows.length > 0) {
          await client.query(
            `UPDATE public.products SET product_type = 'variable' WHERE id = $1`,
            [productId]
          );
        }

        // Replace product images if provided
        if (product_images.length) {
          await client.query(
            `DELETE FROM public.product_images WHERE product_id = $1`,
            [productId]
          );
          for (let idxImg = 0; idxImg < product_images.length; idxImg++) {
            await client.query(
              `INSERT INTO public.product_images (product_id, media_id, display_order)
               VALUES ($1, $2::uuid, $3)`,
              [productId, product_images[idxImg], idxImg]
            );
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
            const ex = await client.query(
              `SELECT id FROM public.product_variants WHERE sku = $1 LIMIT 1`,
              [variant_sku]
            );
            if (ex.rows.length) {
              variantId = ex.rows[0].id as string;
              if (mode !== "create") {
                await client.query(
                  `UPDATE public.product_variants
                   SET status = $2, stock = $3, weight = $4,
                       regular_price = NULLIF($5,'')::numeric,
                       sale_price = NULLIF($6,'')::numeric,
                       sale_start_date = NULLIF($7,'')::timestamptz,
                       sale_end_date = NULLIF($8,'')::timestamptz
                   WHERE id = $1`,
                  [
                    variantId,
                    vstatus,
                    vstock,
                    vweight,
                    vreg,
                    vsale,
                    vstart,
                    vend,
                  ]
                );
                result.updatedVariants++;
              }
            } else if (mode !== "update") {
              const insv = await client.query(
                `INSERT INTO public.product_variants
                 (product_id, sku, status, stock, weight, regular_price, sale_price, sale_start_date, sale_end_date)
                 VALUES ($1,$2,$3,$4,$5,NULLIF($6,'')::numeric,NULLIF($7,'')::numeric,NULLIF($8,'')::timestamptz,NULLIF($9,'')::timestamptz)
                 RETURNING id`,
                [
                  productId,
                  variant_sku,
                  vstatus,
                  vstock,
                  vweight,
                  vreg,
                  vsale,
                  vstart,
                  vend,
                ]
              );
              variantId = insv.rows[0].id as string;
              result.createdVariants++;
            }
          }
          if (!variantId) continue;

          // Replace variant images if provided
          if (vimages.length) {
            await client.query(
              `DELETE FROM public.product_variant_images WHERE product_variant_id = $1`,
              [variantId]
            );
            for (let iimg = 0; iimg < vimages.length; iimg++) {
              await client.query(
                `INSERT INTO public.product_variant_images (product_variant_id, media_id, display_order)
                 VALUES ($1, $2::uuid, $3)`,
                [variantId, vimages[iimg], iimg]
              );
            }
          }

          // Attributes mapping
          if (vattrs.length) {
            // Clear and re-link
            await client.query(
              `DELETE FROM public.product_variant_attribute_values WHERE product_variant_id = $1`,
              [variantId]
            );
            for (const pair of vattrs) {
              const [rawName, ...rest] = pair.split("=");
              const name = (rawName || "").trim();
              const value = rest.join("=").trim();
              if (!name || !value) continue;
              // ensure attribute
              const attr = await client.query(
                `INSERT INTO public.product_attributes (name)
                 VALUES ($1)
                 ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id`,
                [name]
              );
              const attributeId = attr.rows[0].id as string;
              const val = await client.query(
                `INSERT INTO public.product_attribute_values (attribute_id, value)
                 VALUES ($1, $2)
                 ON CONFLICT (attribute_id, value) DO UPDATE SET value = EXCLUDED.value
                 RETURNING id`,
                [attributeId, value]
              );
              const valueId = val.rows[0].id as string;
              await client.query(
                `INSERT INTO public.product_variant_attribute_values (product_variant_id, attribute_value_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [variantId, valueId]
              );
            }
          }
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      await pool.query("ROLLBACK");
      console.error("Import failed", e);
      return NextResponse.json({ error: "Import failed" }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

*/

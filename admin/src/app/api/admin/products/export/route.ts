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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const filter = searchParams.get("filter") || "all";
    const sort = searchParams.get("sort") || "created_desc";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";

    // Build WHERE clause
    const where: string[] = [];
    const params: any[] = [];

    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      where.push(
        `(p.name ILIKE $${params.length - 1} OR p.slug ILIKE $${params.length})`
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
    const productsRes = await pool.query(
      `SELECT p.id, p.slug, p.name, p.description, p.status, p.currency,
              p.regular_price, p.sale_price, p.sale_start_date, p.sale_end_date,
              p.stock, p.weight, p.sku, p.category_id, p.tax_class_id, p.featured_image_id,
              p.product_type
       FROM public.products p
       ${whereSql}
       ORDER BY ${orderBy}`,
      params
    );

    const productIds = productsRes.rows.map((r: any) => r.id);
    const imagesByProduct = new Map<string, string[]>();
    const variantsByProduct = new Map<string, any[]>();
    const variantImagesByVariant = new Map<string, string[]>();
    const attrsByVariant = new Map<string, string[]>();

    if (productIds.length) {
      // product images
      const imgRes = await pool.query(
        `SELECT pi.product_id, pi.media_id
         FROM public.product_images pi
         WHERE pi.product_id = ANY($1::uuid[])
         ORDER BY pi.product_id, pi.display_order ASC`,
        [productIds]
      );
      for (const r of imgRes.rows) {
        const arr = imagesByProduct.get(r.product_id) || [];
        arr.push(r.media_id);
        imagesByProduct.set(r.product_id, arr);
      }

      // variants
      const vRes = await pool.query(
        `SELECT v.id, v.product_id, v.sku, v.status, v.stock, v.weight,
                v.regular_price, v.sale_price, v.sale_start_date, v.sale_end_date
         FROM public.product_variants v
         WHERE v.product_id = ANY($1::uuid[])
         ORDER BY v.created_at ASC`,
        [productIds]
      );
      for (const r of vRes.rows) {
        const arr = variantsByProduct.get(r.product_id) || [];
        arr.push(r);
        variantsByProduct.set(r.product_id, arr);
      }

      const vIds = vRes.rows.map((r: any) => r.id);
      if (vIds.length) {
        // variant images
        const viRes = await pool.query(
          `SELECT product_variant_id, media_id
           FROM public.product_variant_images
           WHERE product_variant_id = ANY($1::uuid[])
           ORDER BY product_variant_id, display_order ASC`,
          [vIds]
        );
        for (const r of viRes.rows) {
          const arr = variantImagesByVariant.get(r.product_variant_id) || [];
          arr.push(r.media_id);
          variantImagesByVariant.set(r.product_variant_id, arr);
        }

        // variant attributes
        const vaRes = await pool.query(
          `SELECT vv.product_variant_id, pa.name AS attribute_name, pav.value AS attribute_value
           FROM public.product_variant_attribute_values vv
           JOIN public.product_attribute_values pav ON pav.id = vv.attribute_value_id
           JOIN public.product_attributes pa ON pa.id = pav.attribute_id
           WHERE vv.product_variant_id = ANY($1::uuid[])
           ORDER BY pa.name ASC`,
          [vIds]
        );
        for (const r of vaRes.rows) {
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

    for (const p of productsRes.rows) {
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

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="products-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
}

*/

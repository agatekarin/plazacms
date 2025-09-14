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
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { pool } from "../../../../lib/db";

// GET /api/admin/products -> list products with filtering/pagination
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const filter = url.searchParams.get("filter") || "all"; // all | on_sale | out_of_stock | status:<value>
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  if (q) {
    params.push(`%${q}%`);
    params.push(`%${q}%`);
    where.push(`(p.name ILIKE $${params.length - 1} OR p.slug ILIKE $${params.length})`);
  }

  if (filter === "on_sale") {
    where.push("p.sale_price IS NOT NULL AND (p.sale_start_date IS NULL OR p.sale_start_date <= NOW()) AND (p.sale_end_date IS NULL OR p.sale_end_date >= NOW())");
  } else if (filter === "out_of_stock") {
    where.push("p.stock <= 0");
  } else if (filter.startsWith("status:")) {
    const val = filter.split(":")[1];
    params.push(val);
    where.push(`p.status = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT p.id, p.name, p.slug, p.sku, p.status, p.stock, p.regular_price, p.currency, p.created_at,
           c.name AS category_name, p.featured_image_id,
           m.file_url AS featured_image_url, m.filename AS featured_image_filename
      FROM public.products p
      LEFT JOIN public.categories c ON c.id = p.category_id
      LEFT JOIN public.media m ON m.id = p.featured_image_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countSql = `SELECT COUNT(*)::int AS count FROM public.products p ${whereSql}`;

  const [countRes, listRes] = await Promise.all([
    pool.query(countSql, params),
    pool.query(listSql, [...params, pageSize, offset]),
  ]);

  return NextResponse.json({
    items: listRes.rows,
    total: countRes.rows[0]?.count ?? 0,
    page,
    pageSize,
  });
}

// POST /api/admin/products -> create a new product aligned to schema
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    name,
    slug,
    description,
    regular_price,
    currency = "USD",
    stock = 0,
    category_id = null,
    status = "draft",
    sku = null,
    weight = 0,
    sale_price = null,
    sale_start_date = null,
    sale_end_date = null,
    tax_class_id = null,
    product_type = "simple",
    featured_image_id = null,
  } = body || {};

  // Basic validations aligned with schema constraints
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (typeof slug !== "string" || !slug.trim()) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (regular_price === undefined || regular_price === null || isNaN(Number(regular_price))) {
    return NextResponse.json({ error: "regular_price must be a number" }, { status: 400 });
  }
  if (typeof currency !== "string" || !currency) return NextResponse.json({ error: "currency is required" }, { status: 400 });
  if (!["published", "private", "draft", "archived"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (!["simple", "variable"].includes(product_type)) {
    return NextResponse.json({ error: "invalid product_type" }, { status: 400 });
  }

  try {
    const insertSql = `
      INSERT INTO public.products (
        name, slug, description, regular_price, currency, stock,
        category_id, vendor_id, status, weight, sku, sale_price, sale_start_date, sale_end_date, tax_class_id, product_type, featured_image_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING id, name, slug, sku, status, stock, regular_price, currency, created_at, product_type, featured_image_id
    `;
    // vendor_id: for now set to null (created by admin)
    const values = [
      name,
      slug,
      typeof description === "string" ? description : null,
      Number(regular_price),
      currency,
      Number(stock) || 0,
      category_id || null,
      null, // vendor_id
      status,
      Number(weight) || 0,
      sku || null,
      sale_price !== null && sale_price !== undefined ? Number(sale_price) : null,
      sale_start_date ? new Date(sale_start_date) : null,
      sale_end_date ? new Date(sale_end_date) : null,
      tax_class_id || null,
      product_type,
      featured_image_id || null,
    ];

    const { rows } = await pool.query(insertSql, values);
    return NextResponse.json({ ok: true, item: rows[0] }, { status: 201 });
  } catch (err: any) {
    // Unique constraint hints
    const msg: string = err?.message || "DB error";
    if (msg.includes("products_slug_key")) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    if (msg.includes("products_sku_key")) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create product", detail: msg }, { status: 500 });
  }
}

*/

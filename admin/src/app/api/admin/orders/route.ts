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

// GET /api/admin/orders -> list orders with filtering/pagination
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const payment_status = url.searchParams.get("payment_status") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  // Search by order number, user email, or customer name
  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    where.push(
      `(o.order_number ILIKE $${params.length - 2} OR u.email ILIKE $${
        params.length - 1
      } OR u.name ILIKE $${params.length})`
    );
  }

  // Filter by order status
  if (
    status &&
    [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ].includes(status)
  ) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }

  // Filter by payment status
  if (
    payment_status &&
    ["pending", "completed", "failed", "refunded"].includes(payment_status)
  ) {
    params.push(payment_status);
    where.push(`o.payment_status = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount,
           o.currency, o.shipping_cost, o.payment_method, o.tracking_number,
           o.created_at, o.updated_at,
           u.id as user_id, u.name as customer_name, u.email as customer_email,
           pm.name as payment_method_name,
           sm.name as shipping_method_name
    FROM public.orders o
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_methods pm ON pm.id = o.payment_method_id
    LEFT JOIN public.shipping_methods sm ON sm.id = o.shipping_zone_method_id
    ${whereSql}
    ORDER BY o.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countSql = `
    SELECT COUNT(*) 
    FROM public.orders o
    LEFT JOIN public.users u ON u.id = o.user_id
    ${whereSql}
  `;

  try {
    params.push(pageSize, offset);
    const [listRes, countRes] = await Promise.all([
      pool.query(listSql, params.slice(0, -2).concat([pageSize, offset])),
      pool.query(countSql, params.slice(0, -2)),
    ]);

    return NextResponse.json({
      items: listRes.rows,
      total: countRes.rows[0]?.count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to fetch orders", detail: msg },
      { status: 500 }
    );
  }
}

// POST /api/admin/orders -> create a new order (manual order creation)
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    user_id,
    status = "pending",
    total_amount,
    currency = "USD",
    shipping_address,
    billing_address,
    payment_method = null,
    payment_status = "pending",
    shipping_cost = 0,
    payment_method_id = null,
    shipping_zone_method_id = null,
    carrier_id = null,
    items = [],
  } = body || {};

  // Basic validations
  if (!user_id)
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  if (
    total_amount === undefined ||
    total_amount === null ||
    isNaN(Number(total_amount))
  ) {
    return NextResponse.json(
      { error: "total_amount must be a number" },
      { status: 400 }
    );
  }
  if (!shipping_address || !billing_address) {
    return NextResponse.json(
      { error: "shipping_address and billing_address are required" },
      { status: 400 }
    );
  }
  if (
    ![
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ].includes(status)
  ) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (
    !["pending", "completed", "failed", "refunded"].includes(payment_status)
  ) {
    return NextResponse.json(
      { error: "invalid payment_status" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertOrderSql = `
      INSERT INTO public.orders (
        user_id, status, total_amount, currency, shipping_address, billing_address,
        payment_method, payment_status, shipping_cost, payment_method_id,
        shipping_zone_method_id, carrier_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
      RETURNING id, order_number, status, payment_status, total_amount, currency, created_at
    `;

    const orderResult = await client.query(insertOrderSql, [
      user_id,
      status,
      total_amount,
      currency,
      JSON.stringify(shipping_address),
      JSON.stringify(billing_address),
      payment_method,
      payment_status,
      shipping_cost,
      payment_method_id,
      shipping_zone_method_id,
      carrier_id,
    ]);

    const order = orderResult.rows[0];

    // Insert order items if provided
    if (items && items.length > 0) {
      const insertItemsSql = `
        INSERT INTO public.order_items (order_id, product_name, product_price, quantity, product_variant_id)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const item of items) {
        await client.query(insertItemsSql, [
          order.id,
          item.product_name,
          item.product_price,
          item.quantity,
          item.product_variant_id,
        ]);
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ order });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to create order", detail: msg },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

*/

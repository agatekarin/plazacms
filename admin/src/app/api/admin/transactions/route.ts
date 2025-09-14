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

// GET /api/admin/transactions -> list transactions with filtering/pagination
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const gateway = url.searchParams.get("gateway") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  // Search by transaction ID, order number, or customer details
  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    where.push(`(
      pt.provider_transaction_id ILIKE $${params.length - 3} OR 
      o.order_number ILIKE $${params.length - 2} OR 
      u.email ILIKE $${params.length - 1} OR 
      u.name ILIKE $${params.length}
    )`);
  }

  // Filter by transaction status
  if (
    status &&
    [
      "requires_action",
      "pending",
      "authorized",
      "captured",
      "succeeded",
      "failed",
      "canceled",
      "refunded",
    ].includes(status)
  ) {
    params.push(status);
    where.push(`pt.status = $${params.length}`);
  }

  // Filter by payment gateway
  if (gateway) {
    params.push(gateway);
    where.push(`pg.slug = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT pt.id, pt.provider_transaction_id, pt.status, pt.amount, pt.currency,
           pt.is_test, pt.created_at, pt.updated_at,
           o.id as order_id, o.order_number, o.status as order_status,
           u.id as user_id, u.name as customer_name, u.email as customer_email,
           pg.name as gateway_name, pg.slug as gateway_slug,
           pm.name as method_name,
           COALESCE(pr.refund_count, 0) AS refund_count,
           COALESCE(pr.refunded_amount, 0)::float AS refunded_amount
    FROM public.payment_transactions pt
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
    LEFT JOIN public.payment_methods pm ON pm.id = pt.method_id
    LEFT JOIN (
      SELECT transaction_id,
             COUNT(*) FILTER (WHERE status = 'succeeded') AS refund_count,
             COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) AS refunded_amount
      FROM public.payment_refunds
      GROUP BY transaction_id
    ) pr ON pr.transaction_id = pt.id
    ${whereSql}
    ORDER BY pt.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countSql = `
    SELECT COUNT(*) 
    FROM public.payment_transactions pt
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
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
      { error: "Failed to fetch transactions", detail: msg },
      { status: 500 }
    );
  }
}

// POST /api/admin/transactions -> create a new transaction (manual transaction)
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    order_id,
    gateway_id,
    method_id = null,
    provider_transaction_id = null,
    status = "pending",
    amount,
    currency = "USD",
    is_test = false,
    meta = null,
  } = body || {};

  // Basic validations
  if (!order_id)
    return NextResponse.json(
      { error: "order_id is required" },
      { status: 400 }
    );
  if (!gateway_id)
    return NextResponse.json(
      { error: "gateway_id is required" },
      { status: 400 }
    );
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return NextResponse.json(
      { error: "amount must be a number" },
      { status: 400 }
    );
  }
  if (
    ![
      "requires_action",
      "pending",
      "authorized",
      "captured",
      "succeeded",
      "failed",
      "canceled",
      "refunded",
    ].includes(status)
  ) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  try {
    const insertSql = `
      INSERT INTO public.payment_transactions (
        order_id, gateway_id, method_id, provider_transaction_id, status,
        amount, currency, is_test, meta
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING id, provider_transaction_id, status, amount, currency, created_at
    `;

    const result = await pool.query(insertSql, [
      order_id,
      gateway_id,
      method_id,
      provider_transaction_id,
      status,
      amount,
      currency,
      is_test,
      meta ? JSON.stringify(meta) : null,
    ]);

    return NextResponse.json({ transaction: result.rows[0] });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to create transaction", detail: msg },
      { status: 500 }
    );
  }
}

*/

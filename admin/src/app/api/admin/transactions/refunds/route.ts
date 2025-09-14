import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

// GET /api/admin/transactions/refunds -> list all refunds
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];

  // Search by refund ID, transaction ID, order number, or customer details
  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    where.push(`(
      pr.provider_refund_id ILIKE $${params.length - 4} OR 
      pt.provider_transaction_id ILIKE $${params.length - 3} OR 
      o.order_number ILIKE $${params.length - 2} OR 
      u.email ILIKE $${params.length - 1} OR 
      u.name ILIKE $${params.length}
    )`);
  }

  // Filter by refund status
  if (status && ["pending", "succeeded", "failed"].includes(status)) {
    params.push(status);
    where.push(`pr.status = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT pr.id, pr.amount, pr.reason, pr.provider_refund_id, pr.status, 
           pr.created_at, pr.updated_at,
           pt.id as transaction_id, pt.provider_transaction_id, pt.amount as transaction_amount,
           o.id as order_id, o.order_number, o.status as order_status,
           u.id as user_id, u.name as customer_name, u.email as customer_email,
           pg.name as gateway_name, pg.slug as gateway_slug
    FROM public.payment_refunds pr
    LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
    ${whereSql}
    ORDER BY pr.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countSql = `
    SELECT COUNT(*) 
    FROM public.payment_refunds pr
    LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    ${whereSql}
  `;

  const sumSql = `
    SELECT COALESCE(SUM(pr.amount), 0) AS total_amount
    FROM public.payment_refunds pr
    LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
    LEFT JOIN public.orders o ON o.id = pt.order_id
    LEFT JOIN public.users u ON u.id = o.user_id
    ${whereSql}
  `;

  try {
    params.push(pageSize, offset);
    const baseParams = params.slice(0, -2);
    const [listRes, countRes, sumRes] = await Promise.all([
      pool.query(listSql, baseParams.concat([pageSize, offset])),
      pool.query(countSql, baseParams),
      pool.query(sumSql, baseParams),
    ]);

    return NextResponse.json({
      items: listRes.rows,
      total: Number(countRes.rows[0]?.count ?? 0),
      sum: Number(sumRes.rows[0]?.total_amount ?? 0),
      page,
      pageSize,
    });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to fetch refunds", detail: msg },
      { status: 500 }
    );
  }
}

// POST /api/admin/transactions/refunds -> create a new refund
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    transaction_id,
    amount,
    reason = null,
    provider_refund_id = null,
    status = "pending",
    meta = null,
  } = body || {};

  // Basic validations
  if (!transaction_id)
    return NextResponse.json(
      { error: "transaction_id is required" },
      { status: 400 }
    );
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return NextResponse.json(
      { error: "amount must be a number" },
      { status: 400 }
    );
  }
  if (!["pending", "succeeded", "failed"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if transaction exists and can be refunded
    const checkTransactionSql = `
      SELECT id, amount, status, order_id 
      FROM public.payment_transactions 
      WHERE id = $1
    `;
    const transactionResult = await client.query(checkTransactionSql, [
      transaction_id,
    ]);

    if (transactionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const transaction = transactionResult.rows[0];
    if (!["succeeded", "captured"].includes(transaction.status)) {
      return NextResponse.json(
        {
          error: "Transaction must be succeeded or captured to be refunded",
        },
        { status: 400 }
      );
    }

    // Check existing refunds to ensure we don't exceed the transaction amount
    const existingRefundsSql = `
      SELECT COALESCE(SUM(amount), 0) as total_refunded
      FROM public.payment_refunds 
      WHERE transaction_id = $1 AND status = 'succeeded'
    `;
    const refundsResult = await client.query(existingRefundsSql, [
      transaction_id,
    ]);
    const totalRefunded = parseFloat(
      refundsResult.rows[0]?.total_refunded || 0
    );
    const transactionAmount = parseFloat(transaction.amount);
    const refundAmount = parseFloat(amount);

    if (totalRefunded + refundAmount > transactionAmount) {
      return NextResponse.json(
        {
          error: `Refund amount exceeds available balance. Available: ${
            transactionAmount - totalRefunded
          }`,
        },
        { status: 400 }
      );
    }

    // Create the refund
    const insertSql = `
      INSERT INTO public.payment_refunds (
        transaction_id, amount, reason, provider_refund_id, status, meta
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )
      RETURNING id, amount, reason, provider_refund_id, status, created_at
    `;

    const refundResult = await client.query(insertSql, [
      transaction_id,
      amount,
      reason,
      provider_refund_id,
      status,
      meta ? JSON.stringify(meta) : null,
    ]);

    // If refund is successful and covers the full transaction amount, update transaction status
    if (
      status === "succeeded" &&
      totalRefunded + refundAmount >= transactionAmount
    ) {
      await client.query(
        "UPDATE public.payment_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        ["refunded", transaction_id]
      );

      // Also update order payment status if fully refunded
      await client.query(
        "UPDATE public.orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        ["refunded", transaction.order_id]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ refund: refundResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to create refund", detail: msg },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

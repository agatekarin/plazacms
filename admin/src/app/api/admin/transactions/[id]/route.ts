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
import { auth } from "../../../../../lib/auth";
import { pool } from "../../../../../lib/db";

// GET /api/admin/transactions/[id] -> get transaction detail with refunds
export async function GET(req: Request, context: { params: any }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params } = await context;
  const transactionId = params.id;

  if (!transactionId) {
    return NextResponse.json(
      { error: "Transaction ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get transaction details
    const transactionSql = `
      SELECT pt.*, 
             o.id as order_id, o.order_number, o.status as order_status, o.total_amount as order_total,
             u.id as user_id, u.name as customer_name, u.email as customer_email,
             pg.name as gateway_name, pg.slug as gateway_slug, pg.settings as gateway_settings,
             pm.name as method_name
      FROM public.payment_transactions pt
      LEFT JOIN public.orders o ON o.id = pt.order_id
      LEFT JOIN public.users u ON u.id = o.user_id
      LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
      LEFT JOIN public.payment_methods pm ON pm.id = pt.method_id
      WHERE pt.id = $1
    `;

    // Get refunds for this transaction
    const refundsSql = `
      SELECT pr.*, 
             pt.provider_transaction_id as original_transaction_id
      FROM public.payment_refunds pr
      LEFT JOIN public.payment_transactions pt ON pt.id = pr.transaction_id
      WHERE pr.transaction_id = $1
      ORDER BY pr.created_at DESC
    `;

    const [transactionResult, refundsResult] = await Promise.all([
      pool.query(transactionSql, [transactionId]),
      pool.query(refundsSql, [transactionId]),
    ]);

    if (transactionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const transaction = {
      ...transactionResult.rows[0],
      refunds: refundsResult.rows,
    };

    return NextResponse.json({ transaction });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to fetch transaction", detail: msg },
      { status: 500 }
    );
  }
}

// PUT /api/admin/transactions/[id] -> update transaction
export async function PUT(req: Request, context: { params: any }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params } = await context;
  const transactionId = params.id;

  if (!transactionId) {
    return NextResponse.json(
      { error: "Transaction ID is required" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { status, provider_transaction_id, amount, meta } = body || {};

  // Build update query dynamically based on provided fields
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
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
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updateFields.push(`status = $${paramIndex++}`);
    updateValues.push(status);
  }

  if (provider_transaction_id !== undefined) {
    updateFields.push(`provider_transaction_id = $${paramIndex++}`);
    updateValues.push(provider_transaction_id);
  }

  if (amount !== undefined) {
    if (isNaN(Number(amount))) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    updateFields.push(`amount = $${paramIndex++}`);
    updateValues.push(amount);
  }

  if (meta !== undefined) {
    updateFields.push(`meta = $${paramIndex++}`);
    updateValues.push(meta ? JSON.stringify(meta) : null);
  }

  if (updateFields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(transactionId);

    const updateSql = `
      UPDATE public.payment_transactions
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, provider_transaction_id, status, amount, currency, updated_at
    `;

    const result = await pool.query(updateSql, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction: result.rows[0] });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to update transaction", detail: msg },
      { status: 500 }
    );
  }
}

*/

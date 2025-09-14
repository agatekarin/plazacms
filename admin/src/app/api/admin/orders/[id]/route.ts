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

// GET /api/admin/orders/[id] -> get order detail with items and transactions
export async function GET(req: Request, context: { params: any }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params } = await context;
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get order details
    const orderSql = `
      SELECT o.*, 
             u.id as user_id, u.name as customer_name, u.email as customer_email,
             pm.name as payment_method_name,
             sm.name as shipping_method_name
      FROM public.orders o
      LEFT JOIN public.users u ON u.id = o.user_id
      LEFT JOIN public.payment_methods pm ON pm.id = o.payment_method_id
      LEFT JOIN public.shipping_methods sm ON sm.id = o.shipping_zone_method_id
      WHERE o.id = $1
    `;

    // Get order items
    const itemsSql = `
      SELECT oi.*, 
             pv.sku as variant_sku,
             p.name as product_name, p.slug as product_slug
      FROM public.order_items oi
      LEFT JOIN public.product_variants pv ON pv.id = oi.product_variant_id
      LEFT JOIN public.products p ON p.id = pv.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `;

    // Get payment transactions
    const transactionsSql = `
      SELECT pt.*, 
             pg.name as gateway_name, pg.slug as gateway_slug,
             pm.name as method_name
      FROM public.payment_transactions pt
      LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
      LEFT JOIN public.payment_methods pm ON pm.id = pt.method_id
      WHERE pt.order_id = $1
      ORDER BY pt.created_at DESC
    `;

    const [orderResult, itemsResult, transactionsResult] = await Promise.all([
      pool.query(orderSql, [orderId]),
      pool.query(itemsSql, [orderId]),
      pool.query(transactionsSql, [orderId]),
    ]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = {
      ...orderResult.rows[0],
      items: itemsResult.rows,
      transactions: transactionsResult.rows,
    };

    return NextResponse.json({ order });
  } catch (err) {
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to fetch order", detail: msg },
      { status: 500 }
    );
  }
}

// PUT /api/admin/orders/[id] -> update order
export async function PUT(req: Request, context: { params: any }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params } = await context;
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const {
    status,
    payment_status,
    total_amount,
    shipping_cost,
    shipping_address,
    billing_address,
    payment_method,
    tracking_number,
    payment_method_id,
    shipping_zone_method_id,
    carrier_id,
    items,
  } = body || {};

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Build update query dynamically based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
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
        throw new Error("Invalid status");
      }
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (payment_status !== undefined) {
      if (
        !["pending", "completed", "failed", "refunded"].includes(payment_status)
      ) {
        throw new Error("Invalid payment_status");
      }
      updateFields.push(`payment_status = $${paramIndex++}`);
      updateValues.push(payment_status);
    }

    if (total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramIndex++}`);
      updateValues.push(total_amount);
    }

    if (shipping_cost !== undefined) {
      updateFields.push(`shipping_cost = $${paramIndex++}`);
      updateValues.push(shipping_cost);
    }

    if (shipping_address !== undefined) {
      updateFields.push(`shipping_address = $${paramIndex++}`);
      updateValues.push(JSON.stringify(shipping_address));
    }

    if (billing_address !== undefined) {
      updateFields.push(`billing_address = $${paramIndex++}`);
      updateValues.push(JSON.stringify(billing_address));
    }

    if (payment_method !== undefined) {
      updateFields.push(`payment_method = $${paramIndex++}`);
      updateValues.push(payment_method);
    }

    if (tracking_number !== undefined) {
      updateFields.push(`tracking_number = $${paramIndex++}`);
      updateValues.push(tracking_number);
    }

    if (payment_method_id !== undefined) {
      updateFields.push(`payment_method_id = $${paramIndex++}`);
      updateValues.push(payment_method_id);
    }

    if (shipping_zone_method_id !== undefined) {
      updateFields.push(`shipping_zone_method_id = $${paramIndex++}`);
      updateValues.push(shipping_zone_method_id);
    }

    if (carrier_id !== undefined) {
      updateFields.push(`carrier_id = $${paramIndex++}`);
      updateValues.push(carrier_id);
    }

    if (updateFields.length === 0 && !items) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update order if there are fields to update
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(orderId);

      const updateOrderSql = `
        UPDATE public.orders
        SET ${updateFields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id, order_number, status, payment_status, total_amount, currency, updated_at
      `;

      await client.query(updateOrderSql, updateValues);
    }

    // Update order items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await client.query("DELETE FROM public.order_items WHERE order_id = $1", [
        orderId,
      ]);

      // Insert new items
      const insertItemsSql = `
        INSERT INTO public.order_items (order_id, product_name, product_price, quantity, product_variant_id)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const item of items) {
        await client.query(insertItemsSql, [
          orderId,
          item.product_name,
          item.product_price,
          item.quantity,
          item.product_variant_id,
        ]);
      }
    }

    await client.query("COMMIT");

    // Return updated order
    const updatedOrderSql = `
      SELECT o.*, 
             u.name as customer_name, u.email as customer_email
      FROM public.orders o
      LEFT JOIN public.users u ON u.id = o.user_id
      WHERE o.id = $1
    `;
    const result = await pool.query(updatedOrderSql, [orderId]);

    return NextResponse.json({ order: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to update order", detail: msg },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE /api/admin/orders/[id] -> delete order (soft delete or hard delete)
export async function DELETE(req: Request, context: { params: any }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params } = await context;
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if order exists and can be deleted
    const checkSql = "SELECT id, status FROM public.orders WHERE id = $1";
    const checkResult = await client.query(checkSql, [orderId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = checkResult.rows[0];
    if (["shipped", "delivered"].includes(order.status)) {
      return NextResponse.json(
        {
          error: "Cannot delete shipped or delivered orders",
        },
        { status: 400 }
      );
    }

    // Delete order items first (due to foreign key constraint)
    await client.query("DELETE FROM public.order_items WHERE order_id = $1", [
      orderId,
    ]);

    // Delete the order
    await client.query("DELETE FROM public.orders WHERE id = $1", [orderId]);

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = (err as Error)?.message || "DB error";
    return NextResponse.json(
      { error: "Failed to delete order", detail: msg },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

*/

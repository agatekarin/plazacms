import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const orders = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/orders - List orders with filtering/pagination
orders.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const q = (url.searchParams.get("q") || "").trim();
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
  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    where.push(
      `(o.order_number ILIKE $${params.length - 2} OR u.email ILIKE $${
        params.length - 1
      } OR u.name ILIKE $${params.length})`
    );
  }
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
    SELECT COUNT(*) FROM public.orders o
    LEFT JOIN public.users u ON u.id = o.user_id
    ${whereSql}
  `;
  try {
    const list = await sql.unsafe(listSql, params.concat([pageSize, offset]));
    const cnt = await sql.unsafe(countSql, params);
    const total = cnt?.[0]?.count ?? 0;
    return c.json({ items: list, total, page, pageSize });
  } catch (err) {
    console.error("[orders:list]", err);
    return c.json({ error: "Failed to fetch orders" }, 500);
  }
});

// POST /api/admin/orders - Create a new order (manual)
orders.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const b = await c.req.json().catch(() => ({}));
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
  } = b || {};
  if (!user_id) return c.json({ error: "user_id is required" }, 400);
  if (
    total_amount === undefined ||
    total_amount === null ||
    isNaN(Number(total_amount))
  )
    return c.json({ error: "total_amount must be a number" }, 400);
  if (!shipping_address || !billing_address)
    return c.json(
      { error: "shipping_address and billing_address are required" },
      400
    );
  if (
    ![
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ].includes(status)
  )
    return c.json({ error: "invalid status" }, 400);
  if (!["pending", "completed", "failed", "refunded"].includes(payment_status))
    return c.json({ error: "invalid payment_status" }, 400);

  try {
    const orderRows = await sql`
      INSERT INTO public.orders (
        user_id, status, total_amount, currency, shipping_address, billing_address,
        payment_method, payment_status, shipping_cost, payment_method_id,
        shipping_zone_method_id, carrier_id
      ) VALUES (
        ${user_id}, ${status}, ${total_amount}, ${currency}, ${JSON.stringify(
      shipping_address
    )}, ${JSON.stringify(billing_address)},
        ${payment_method}, ${payment_status}, ${shipping_cost}, ${payment_method_id}, ${shipping_zone_method_id}, ${carrier_id}
      ) RETURNING id, order_number, status, payment_status, total_amount, currency, created_at
    `;
    const order = orderRows[0];
    if (items && Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        await sql`
          INSERT INTO public.order_items (order_id, product_name, product_price, quantity, product_variant_id)
          VALUES (${order.id}, ${it.product_name}, ${it.product_price}, ${it.quantity}, ${it.product_variant_id})
        `;
      }
    }
    return c.json({ order });
  } catch (err) {
    console.error("[orders:create]", err);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

// GET /api/admin/orders/:id - Get order detail with items and transactions
orders.get("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  try {
    const orderRows = await sql`
      SELECT o.*, 
             u.id as user_id, u.name as customer_name, u.email as customer_email,
             pm.name as payment_method_name,
             sm.name as shipping_method_name
      FROM public.orders o
      LEFT JOIN public.users u ON u.id = o.user_id
      LEFT JOIN public.payment_methods pm ON pm.id = o.payment_method_id
      LEFT JOIN public.shipping_methods sm ON sm.id = o.shipping_zone_method_id
      WHERE o.id = ${id}
    `;
    if (!orderRows[0]) return c.json({ error: "Not found" }, 404);
    const items = await sql`
      SELECT oi.*, pv.sku as variant_sku, p.name as product_name, p.slug as product_slug
      FROM public.order_items oi
      LEFT JOIN public.product_variants pv ON pv.id = oi.product_variant_id
      LEFT JOIN public.products p ON p.id = pv.product_id
      WHERE oi.order_id = ${id}
      ORDER BY oi.created_at ASC
    `;
    const txs = await sql`
      SELECT pt.*, pg.name as gateway_name, pg.slug as gateway_slug, pm.name as method_name
      FROM public.payment_transactions pt
      LEFT JOIN public.payment_gateways pg ON pg.id = pt.gateway_id
      LEFT JOIN public.payment_methods pm ON pm.id = pt.method_id
      WHERE pt.order_id = ${id}
      ORDER BY pt.created_at DESC
    `;
    return c.json({ order: { ...orderRows[0], items, transactions: txs } });
  } catch (err) {
    console.error("[orders:get]", err);
    return c.json({ error: "Failed to fetch order" }, 500);
  }
});

// PUT /api/admin/orders/:id - Update an order (fields + items)
orders.put("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const b = await c.req.json().catch(() => ({}));
  const client = sql;
  try {
    // Build update
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const setField = (cond: boolean, field: string, val: any) => {
      if (!cond) return;
      fields.push(`${field} = $${i++}`);
      values.push(val);
    };
    const validStatus = [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    const validPay = ["pending", "completed", "failed", "refunded"];
    setField(
      b.status !== undefined && validStatus.includes(b.status),
      "status",
      b.status
    );
    setField(
      b.payment_status !== undefined && validPay.includes(b.payment_status),
      "payment_status",
      b.payment_status
    );
    setField(b.total_amount !== undefined, "total_amount", b.total_amount);
    setField(b.shipping_cost !== undefined, "shipping_cost", b.shipping_cost);
    setField(
      b.tracking_number !== undefined,
      "tracking_number",
      b.tracking_number
    );
    setField(
      b.payment_method_id !== undefined,
      "payment_method_id",
      b.payment_method_id
    );
    setField(
      b.shipping_zone_method_id !== undefined,
      "shipping_zone_method_id",
      b.shipping_zone_method_id
    );
    setField(
      b.shipping_address !== undefined,
      "shipping_address",
      JSON.stringify(b.shipping_address)
    );
    setField(
      b.billing_address !== undefined,
      "billing_address",
      JSON.stringify(b.billing_address)
    );

    if (fields.length > 0) {
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      await sql.unsafe(
        `UPDATE public.orders SET ${fields.join(", ")} WHERE id = $${i}`,
        [...values, id]
      );
    }
    if (b.items && Array.isArray(b.items)) {
      await sql`DELETE FROM public.order_items WHERE order_id = ${id}`;
      for (const it of b.items) {
        await sql`
          INSERT INTO public.order_items (order_id, product_name, product_price, quantity, product_variant_id)
          VALUES (${id}, ${it.product_name}, ${it.product_price}, ${it.quantity}, ${it.product_variant_id})
        `;
      }
    }
    const updated = await sql`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM public.orders o LEFT JOIN public.users u ON u.id = o.user_id
      WHERE o.id = ${id}
    `;
    return c.json({ order: updated[0] });
  } catch (err) {
    console.error("[orders:update]", err);
    return c.json({ error: "Failed to update order" }, 500);
  }
});

// DELETE /api/admin/orders/:id - Delete an order (with checks)
orders.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  try {
    const check =
      await sql`SELECT id, status FROM public.orders WHERE id = ${id}`;
    if (!check[0]) return c.json({ error: "Order not found" }, 404);
    if (["shipped", "delivered"].includes(check[0].status)) {
      return c.json(
        { error: "Cannot delete shipped or delivered orders" },
        400
      );
    }
    await sql`DELETE FROM public.order_items WHERE order_id = ${id}`;
    await sql`DELETE FROM public.orders WHERE id = ${id}`;
    return c.json({ success: true });
  } catch (err) {
    console.error("[orders:delete]", err);
    return c.json({ error: "Failed to delete order" }, 500);
  }
});

export default orders;

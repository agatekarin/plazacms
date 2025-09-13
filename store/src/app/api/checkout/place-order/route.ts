import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import { auth } from "@/lib/auth";

type Body = {
  shipping_address: any;
  billing_address?: any;
  shipping_method_id: string;
  payment_method_id: string;
};

export async function POST(req: Request) {
  const client = await db.getClient();
  try {
    const body = (await req.json()) as Body;
    if (
      !body.shipping_method_id ||
      !body.payment_method_id ||
      !body.shipping_address
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const sessionId = await getOrCreateSessionId();

    await client.query("BEGIN");

    // Load cart
    const cart = await client.query(
      `SELECT ci.id, ci.product_variant_id, ci.quantity, ci.price_at_add::numeric, pv.product_id, p.currency
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN product_variants pv ON pv.id = ci.product_variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE c.session_id = $1
      `,
      [sessionId]
    );
    if (cart.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }
    const currency = cart.rows[0].currency as string;

    // Validate payment method
    const pmRes = await client.query<{
      id: string;
      gateway_id: string;
      name: string;
    }>(
      `SELECT id, gateway_id, name FROM payment_methods WHERE id = $1 AND is_enabled = true LIMIT 1`,
      [body.payment_method_id]
    );
    if (pmRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Validate shipping method
    const smRes = await client.query<{
      id: string;
      name: string;
      gateway_name: string;
    }>(
      `SELECT sm.id, sm.name, sg.name as gateway_name
       FROM shipping_methods sm
       JOIN shipping_gateways sg ON sg.id = sm.gateway_id
       WHERE sm.id = $1 AND sm.status = 'active' LIMIT 1`,
      [body.shipping_method_id]
    );
    if (smRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invalid shipping method" },
        { status: 400 }
      );
    }

    // Compute totals
    const subtotal = cart.rows.reduce(
      (s, r) => s + Number(r.price_at_add) * Number(r.quantity),
      0
    );

    // Shipping cost via function
    const weightRes = await client.query(
      `SELECT SUM(COALESCE(pv.weight, p.weight)::numeric * ci.quantity) AS total_g
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN product_variants pv ON pv.id = ci.product_variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE c.session_id = $1`,
      [sessionId]
    );
    const totalWeightG = Number(weightRes.rows[0]?.total_g ?? 0);
    const shipRes = await client.query<{ calc_shipping_cost: string | null }>(
      `SELECT calc_shipping_cost($1::uuid, $2::numeric, $3::int4)`,
      [body.shipping_method_id, subtotal, totalWeightG]
    );
    const calcCost = shipRes.rows[0]?.calc_shipping_cost;
    if (calcCost === null || calcCost === undefined) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Shipping method not applicable" },
        { status: 400 }
      );
    }
    const shippingCost = Number(calcCost);
    const totalAmount = subtotal + shippingCost;

    const user = await auth();

    // Create order — include IDs and denormalized labels; DB trigger sets order_number
    const orderRes = await client.query<{ id: string }>(
      `INSERT INTO orders (
         user_id,
         status,
         total_amount,
         currency,
         shipping_address,
         billing_address,
         payment_status,
         shipping_cost,
         payment_method_id,
         shipping_zone_method_id,
         payment_method,
         shipping_method,
         shipping_provider,
         order_number
       )
       VALUES (
         $1,
         'pending',
         $2,
         $3,
         $4::jsonb,
         $5::jsonb,
         'pending',
         $6,
         $7,
         $8,
         $9,
         $10,
         $11,
         (LPAD(((nextval('public.order_global_seq') % 10000))::text, 4, '0') || TO_CHAR(CURRENT_DATE, 'DDMMYY'))
       )
       RETURNING id`,
      [
        user?.user?.id ?? null,
        totalAmount,
        currency,
        JSON.stringify(body.shipping_address),
        JSON.stringify(body.billing_address ?? body.shipping_address),
        shippingCost,
        pmRes.rows[0].id,
        smRes.rows[0].id,
        pmRes.rows[0].name,
        smRes.rows[0].name,
        smRes.rows[0].gateway_name,
      ]
    );
    const orderId = orderRes.rows[0].id;

    // Insert items snapshot
    for (const r of cart.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_name, product_price, quantity, product_variant_id)
         SELECT $1, p.name, $2, $3, $4
         FROM products p WHERE p.id = $5`,
        [
          orderId,
          r.price_at_add,
          r.quantity,
          r.product_variant_id,
          r.product_id,
        ]
      );
    }

    // Create transaction (pending)
    const txRes = await client.query<{ id: string }>(
      `INSERT INTO payment_transactions (order_id, gateway_id, method_id, status, amount, currency, is_test)
       VALUES ($1, $2, $3, 'pending', $4, $5, false)
       RETURNING id`,
      [
        orderId,
        pmRes.rows[0].gateway_id,
        pmRes.rows[0].id,
        totalAmount,
        currency,
      ]
    );

    // Link transaction to order
    await client.query(`UPDATE orders SET transaction_id = $1 WHERE id = $2`, [
      txRes.rows[0].id,
      orderId,
    ]);

    // Clear cart
    await client.query(
      `DELETE FROM cart_items USING carts WHERE cart_items.cart_id = carts.id AND carts.session_id = $1`,
      [sessionId]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      order_id: orderId,
      total_amount: totalAmount,
      currency,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    const message = e instanceof Error ? e.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_variant_id, product_id, qty } = body as {
      product_variant_id?: string;
      product_id?: string;
      qty: number;
    };
    if ((!product_variant_id && !product_id) || !qty || qty < 1)
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const sessionId = await getOrCreateSessionId();

    // Ensure cart exists
    const cartRes = await db.query<{ id: string }>(
      `INSERT INTO carts (session_id)
       VALUES ($1)
       ON CONFLICT (session_id) DO UPDATE SET session_id = EXCLUDED.session_id
       RETURNING id`,
      [sessionId]
    );
    const cartId = cartRes.rows[0].id;

    // Resolve variant id if only product_id provided
    let targetVariantId = product_variant_id ?? null;
    if (!targetVariantId && product_id) {
      const v = await db.query<{ id: string }>(
        `SELECT id FROM product_variants WHERE product_id = $1 AND status = 'published' ORDER BY created_at ASC LIMIT 1`,
        [product_id]
      );
      if (v.rows.length === 0) {
        return NextResponse.json(
          { error: "No variant for product" },
          { status: 404 }
        );
      }
      targetVariantId = v.rows[0].id;
    }

    // Resolve price from variant or product fallback
    const priceRes = await db.query<{ price: string }>(
      `SELECT COALESCE(pv.sale_price, pv.regular_price, p.sale_price, p.regular_price)::text AS price
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = $1
       LIMIT 1`,
      [targetVariantId]
    );
    if (priceRes.rows.length === 0)
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    const unitPrice = priceRes.rows[0].price ?? "0";

    // Upsert cart item
    const upsert = await db.query(
      `INSERT INTO cart_items (cart_id, product_variant_id, quantity, price_at_add)
       VALUES ($1, $2, $3, $4::numeric)
       ON CONFLICT (cart_id, product_variant_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
       RETURNING id`,
      [cartId, targetVariantId, qty, unitPrice]
    );

    return NextResponse.json({ id: upsert.rows[0].id });
  } catch (e) {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

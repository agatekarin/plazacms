import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orderRes = await db.query(
      `SELECT id, order_number, status, payment_status, total_amount::text, currency,
              shipping_cost::text, shipping_address, billing_address, created_at,
              payment_method, shipping_method, shipping_provider, tracking_number
       FROM orders WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    );
    if (orderRes.rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const itemsRes = await db.query(
      `SELECT oi.product_name, oi.product_price::text, oi.quantity,
              (
                SELECT m.file_url FROM product_variant_images pvi
                JOIN media m ON m.id = pvi.media_id
                WHERE pvi.product_variant_id = oi.product_variant_id
                ORDER BY pvi.display_order ASC LIMIT 1
              ) AS image_url,
              (
                SELECT json_agg(json_build_object('attribute', pa.name, 'value', pav.value) ORDER BY pa.name)
                FROM product_variant_attribute_values vv
                JOIN product_attribute_values pav ON pav.id = vv.attribute_value_id
                JOIN product_attributes pa ON pa.id = pav.attribute_id
                WHERE vv.product_variant_id = oi.product_variant_id
              ) AS attrs
       FROM order_items oi
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [id]
    );
    return NextResponse.json({ order: orderRes.rows[0], items: itemsRes.rows });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load order" },
      { status: 500 }
    );
  }
}

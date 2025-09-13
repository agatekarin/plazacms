import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const { params } = await context;
  try {
    const order = await db.query(
      `SELECT o.id, o.total_amount::text, o.currency, o.status, o.payment_status, o.shipping_cost::text, o.created_at
       FROM orders o WHERE o.id = $1 LIMIT 1`,
      [params.id]
    );
    if (order.rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await db.query(
      `SELECT oi.product_name, oi.product_price::text, oi.quantity,
              pv.sku,
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
       LEFT JOIN product_variants pv ON pv.id = oi.product_variant_id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at ASC`,
      [params.id]
    );
    return NextResponse.json({ order: order.rows[0], items: items.rows });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load order" },
      { status: 500 }
    );
  }
}

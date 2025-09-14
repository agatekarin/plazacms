import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await db.query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount::text, o.currency, o.created_at,
              o.payment_method, o.shipping_method, o.shipping_provider, o.tracking_number,
              (
                SELECT json_agg(t) FROM (
                  SELECT oi.product_name,
                         (
                           SELECT m.file_url FROM product_variant_images pvi
                           JOIN media m ON m.id = pvi.media_id
                           WHERE pvi.product_variant_id = oi.product_variant_id
                           ORDER BY pvi.display_order ASC LIMIT 1
                         ) AS image_url
                  FROM order_items oi
                  WHERE oi.order_id = o.id
                  ORDER BY oi.created_at ASC
                  LIMIT 2
                ) t
              ) AS item_previews
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT 100`,
      [userId]
    );
    return NextResponse.json({ items: rows });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 }
    );
  }
}

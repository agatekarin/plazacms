import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export async function GET() {
  try {
    const sessionId = await getOrCreateSessionId();
    const { rows } = await db.query(
      `SELECT ci.id, ci.product_variant_id, ci.quantity, ci.price_at_add::text,
              pv.product_id, pv.sku,
              p.name, p.currency,
              COALESCE(mv.file_url, mp.file_url, NULL) AS image_url,
              json_agg(json_build_object('attribute', pa.name, 'value', pav.value) ORDER BY pa.name) FILTER (WHERE pav.id IS NOT NULL) AS attrs
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN product_variants pv ON pv.id = ci.product_variant_id
       JOIN products p ON p.id = pv.product_id
       LEFT JOIN product_variant_images pvi ON pvi.product_variant_id = pv.id AND pvi.display_order = 0
       LEFT JOIN media mv ON mv.id = pvi.media_id
       LEFT JOIN media mp ON mp.id = p.featured_image_id
       LEFT JOIN product_variant_attribute_values vv ON vv.product_variant_id = pv.id
       LEFT JOIN product_attribute_values pav ON pav.id = vv.attribute_value_id
       LEFT JOIN product_attributes pa ON pa.id = pav.attribute_id
       WHERE c.session_id = $1
       GROUP BY ci.id, ci.product_variant_id, pv.product_id, pv.sku, p.name, p.currency, mv.file_url, mp.file_url
       ORDER BY ci.created_at DESC`,
      [sessionId]
    );
    const items = rows.map((r: any) => ({
      id: r.id,
      productVariantId: r.product_variant_id,
      name: r.name,
      qty: r.quantity,
      price: Number(r.price_at_add ?? 0),
      currency: r.currency,
      image: r.image_url,
      variantLabel: Array.isArray(r.attrs)
        ? r.attrs.map((a: any) => `${a.attribute} ${a.value}`).join(" • ")
        : null,
    }));
    const subtotal = items.reduce(
      (s: number, i: any) => s + i.price * i.qty,
      0
    );
    return NextResponse.json({ items, subtotal });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 });
  }
}

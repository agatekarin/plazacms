import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export async function getCartSummary() {
  const sessionId = await getOrCreateSessionId();
  const res = await db.query(
    `SELECT ci.quantity, ci.price_at_add::numeric AS price,
            COALESCE(pv.weight, p.weight)::numeric AS weight_g
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     JOIN product_variants pv ON pv.id = ci.product_variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE c.session_id = $1`,
    [sessionId]
  );
  const items = res.rows as Array<{
    quantity: number;
    price: string;
    weight_g: string;
  }>;
  const subtotal = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const totalWeightG = items.reduce(
    (s, i) => s + Number(i.weight_g ?? 0) * i.quantity,
    0
  );
  return { subtotal, totalWeightG };
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCartSummary } from "@/lib/cart";

type Body = {
  country_code: string; // ISO2
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.country_code)
      return NextResponse.json(
        { error: "country_code required" },
        { status: 400 }
      );

    const { subtotal, totalWeightG } = await getCartSummary();

    // Find zone by country code
    const zoneRes = await db.query<{ zone_id: string }>(
      `SELECT zc.zone_id
       FROM shipping_zone_countries zc
       JOIN shipping_zones z ON z.id = zc.zone_id AND z.status = 'active'
       WHERE zc.country_code = $1
       ORDER BY z.priority ASC
       LIMIT 1`,
      [body.country_code]
    );
    if (zoneRes.rows.length === 0) return NextResponse.json({ items: [] });
    const zoneId = zoneRes.rows[0].zone_id;

    // Active methods in zone
    const methods = await db.query<{
      id: string;
      name: string;
      estimated_days_min: number | null;
      estimated_days_max: number | null;
      currency: string;
    }>(
      `SELECT id, name, estimated_days_min, estimated_days_max, currency
       FROM shipping_methods
       WHERE zone_id = $1 AND status = 'active'
       ORDER BY sort_order ASC, name ASC`,
      [zoneId]
    );

    // Calculate cost using DB function
    const priced: Array<{
      id: string;
      name: string;
      cost: number;
      currency: string;
      eta?: string;
    }> = [];
    for (const m of methods.rows) {
      const costRes = await db.query<{ calc_shipping_cost: string }>(
        `SELECT calc_shipping_cost($1::uuid, $2::numeric, $3::int4)`,
        [m.id, subtotal, totalWeightG]
      );
      const costNum = Number(costRes.rows[0]?.calc_shipping_cost ?? 0);
      if (Number.isFinite(costNum)) {
        const eta =
          m.estimated_days_min && m.estimated_days_max
            ? `${m.estimated_days_min}-${m.estimated_days_max} days`
            : undefined;
        priced.push({
          id: m.id,
          name: m.name,
          cost: costNum,
          currency: m.currency,
          eta,
        });
      }
    }

    return NextResponse.json({ items: priced });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch shipping options" },
      { status: 500 }
    );
  }
}

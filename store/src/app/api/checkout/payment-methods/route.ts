import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT pm.id, pm.name, pm.slug, pm.description, pm.display_order,
              pg.name AS gateway_name, pm.settings
       FROM payment_methods pm
       JOIN payment_gateways pg ON pg.id = pm.gateway_id AND pg.is_enabled = true
       WHERE pm.is_enabled = true
       ORDER BY pm.display_order ASC, pm.name ASC`
    );
    return NextResponse.json({ items: rows });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load payment methods" },
      { status: 500 }
    );
  }
}

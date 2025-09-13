import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export async function PATCH(req: Request, context: { params: { id: string } }) {
  const { params } = await context;
  try {
    const body = await req.json();
    const { qty } = body as { qty: number };
    if (!qty || qty < 1)
      return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
    const sessionId = await getOrCreateSessionId();
    await db.query(
      `UPDATE cart_items ci
       SET quantity = $1
       FROM carts c
       WHERE ci.id = $2 AND ci.cart_id = c.id AND c.session_id = $3`,
      [qty, params.id, sessionId]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: { id: string } }
) {
  const { params } = await context;
  try {
    const sessionId = await getOrCreateSessionId();
    await db.query(
      `DELETE FROM cart_items ci
       USING carts c
       WHERE ci.id = $1 AND ci.cart_id = c.id AND c.session_id = $2`,
      [params.id, sessionId]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

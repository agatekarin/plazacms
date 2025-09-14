import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getApiBase() {
  const env = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
  return env === "live" || env === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID as string;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET as string;
  if (!clientId || !clientSecret) throw new Error("Missing PayPal credentials");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to get PayPal token");
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function POST(req: Request) {
  const client = await db.getClient();
  try {
    const {
      paypal_order_id,
      order_id,
    }: { paypal_order_id: string; order_id: string } = await req.json();
    if (!paypal_order_id || !order_id)
      return NextResponse.json({ error: "Missing order ids" }, { status: 400 });

    const accessToken = await getAccessToken();
    const capRes = await fetch(
      `${getApiBase()}/v2/checkout/orders/${paypal_order_id}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );
    if (!capRes.ok) {
      const err = await capRes.text();
      return NextResponse.json(
        { error: "Failed to capture order", detail: err },
        { status: 500 }
      );
    }

    const result = (await capRes.json()) as any;
    const captureId = result?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const status =
      result?.status ||
      result?.purchase_units?.[0]?.payments?.captures?.[0]?.status ||
      "COMPLETED";

    // Update transaction + order
    await client.query("BEGIN");
    const txStatus =
      status.toLowerCase() === "completed" ? "captured" : status.toLowerCase();
    await client.query(
      `UPDATE payment_transactions SET status = $1, provider_transaction_id = $2, meta = $3 WHERE order_id = $4`,
      [txStatus, captureId || paypal_order_id, JSON.stringify(result), order_id]
    );
    await client.query(`UPDATE orders SET payment_status = $1 WHERE id = $2`, [
      status.toLowerCase() === "completed" ? "completed" : status.toLowerCase(),
      order_id,
    ]);
    await client.query("COMMIT");

    return NextResponse.json({ capture_id: captureId, status });
  } catch (e) {
    try {
      await (await db.getClient()).query("ROLLBACK");
    } catch {}
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

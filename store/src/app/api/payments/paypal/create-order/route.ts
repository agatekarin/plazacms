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
    const { order_id }: { order_id: string } = await req.json();
    if (!order_id)
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });

    const { rows } = await client.query(
      `SELECT id, total_amount::numeric, currency FROM orders WHERE id = $1 LIMIT 1`,
      [order_id]
    );
    if (rows.length === 0)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const amount = Number(rows[0].total_amount);
    const currency = String(rows[0].currency || "USD");

    const accessToken = await getAccessToken();

    const returnBase =
      process.env.NEXT_PUBLIC_STORE_BASE_URL || "http://localhost:3002";

    const createRes = await fetch(`${getApiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency, value: amount.toFixed(2) },
            reference_id: order_id,
          },
        ],
        application_context: {
          return_url: `${returnBase}/checkout`,
          cancel_url: `${returnBase}/checkout`,
        },
      }),
      cache: "no-store",
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json(
        { error: "Failed to create PayPal order", detail: err },
        { status: 500 }
      );
    }
    const data = (await createRes.json()) as { id: string };
    return NextResponse.json({ paypal_order_id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

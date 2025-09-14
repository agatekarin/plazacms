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
    const body = (await req.json().catch(() => ({}))) as {
      order_id?: string;
      amount: number;
      currency?: string;
    };
    const { order_id, amount } = body || {};
    if (!order_id || typeof amount !== "number") {
      return NextResponse.json(
        { error: "Missing order_id or amount" },
        { status: 400 }
      );
    }

    // Load last captured transaction for the order
    const { rows } = await client.query(
      `SELECT id, provider_transaction_id, currency FROM payment_transactions 
       WHERE order_id = $1 AND status IN ('captured','succeeded') 
       ORDER BY created_at DESC LIMIT 1`,
      [order_id]
    );
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No captured transaction found" },
        { status: 404 }
      );
    }
    const txId = rows[0].id as string;
    const captureId = rows[0].provider_transaction_id as string;
    const currency = (body.currency || rows[0].currency || "USD") as string;

    const accessToken = await getAccessToken();
    const res = await fetch(
      `${getApiBase()}/v2/payments/captures/${captureId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: { currency_code: currency, value: amount.toFixed(2) },
        }),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Refund failed", detail: err },
        { status: 500 }
      );
    }
    const data = (await res.json()) as any;
    const providerRefundId = data?.id as string | undefined;
    const refundStatus = (data?.status || "PENDING").toString().toLowerCase();

    await client.query(
      `INSERT INTO payment_refunds (transaction_id, amount, reason, provider_refund_id, status, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        txId,
        amount,
        null,
        providerRefundId || null,
        refundStatus === "completed" ? "succeeded" : refundStatus,
        JSON.stringify(data),
      ]
    );

    return NextResponse.json({
      refund_id: providerRefundId,
      status: refundStatus,
      payload: data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

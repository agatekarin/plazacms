import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function getStoreBase() {
  return (
    process.env.NEXT_PUBLIC_STORE_BASE_URL ||
    process.env.STORE_PUBLIC_URL ||
    "http://localhost:3002"
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { order_id, amount } = body as { order_id?: string; amount?: number };
  if (!order_id || typeof amount !== "number")
    return NextResponse.json(
      { error: "Missing order_id or amount" },
      { status: 400 }
    );

  const res = await fetch(`${getStoreBase()}/api/payments/paypal/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id, amount }),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {}
    return NextResponse.json(
      { error: "Refund failed", detail },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

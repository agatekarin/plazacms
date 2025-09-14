// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev instead

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PUT() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PATCH() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

/*
ORIGINAL CODE COMMENTED OUT:
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// POST /api/admin/products/[id]/variants/bulk
// Body: { variant_ids?: string[], action: string, value?: number, percent?: number, status?: string }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  if (!productId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const variant_ids: string[] | undefined = Array.isArray(body?.variant_ids) ? body.variant_ids : undefined;
  const action: string = body?.action || "";
  const value: number | null = typeof body?.value === "number" ? body.value : null;
  const percent: number | null = typeof body?.percent === "number" ? body.percent : null;
  const status: string | null = typeof body?.status === "string" ? body.status : null;

  const whereIds = variant_ids && variant_ids.length ? `AND id = ANY($2::uuid[])` : "";
  const paramsArr: any[] = [productId];
  if (whereIds) paramsArr.push(variant_ids);

  try {
    let sql = "";
    switch (action) {
      case "set_regular_prices":
        if (value === null) return NextResponse.json({ error: "value required" }, { status: 400 });
        sql = `UPDATE public.product_variants SET regular_price = $${paramsArr.length + 1} WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(value);
        break;
      case "increase_regular_prices":
        if (percent === null) return NextResponse.json({ error: "percent required" }, { status: 400 });
        sql = `UPDATE public.product_variants SET regular_price = COALESCE(regular_price,0) * (1 + $${paramsArr.length + 1} / 100.0) WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(percent);
        break;
      case "decrease_regular_prices":
        if (percent === null) return NextResponse.json({ error: "percent required" }, { status: 400 });
        sql = `UPDATE public.product_variants SET regular_price = COALESCE(regular_price,0) * (1 - $${paramsArr.length + 1} / 100.0) WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(percent);
        break;
      case "set_sale_prices":
        if (value === null) return NextResponse.json({ error: "value required" }, { status: 400 });
        sql = `UPDATE public.product_variants SET sale_price = $${paramsArr.length + 1} WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(value);
        break;
      case "set_stock_quantities":
        if (value === null) return NextResponse.json({ error: "value required" }, { status: 400 });
        sql = `UPDATE public.product_variants SET stock = $${paramsArr.length + 1} WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(Math.max(0, value));
        break;
      case "set_weights":
        if (value === null) return NextResponse.json({ error: "value required" }, { status: 400 });
        sql = `UPDATE public.product_variants SET weight = $${paramsArr.length + 1} WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(Math.max(0, Math.floor(value)));
        break;
      case "set_status":
        if (!status || !["published", "private", "draft", "archived"].includes(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
        sql = `UPDATE public.product_variants SET status = $${paramsArr.length + 1} WHERE product_id = $1 ${whereIds}`;
        paramsArr.push(status);
        break;
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const res = await pool.query(sql, paramsArr);
    return NextResponse.json({ ok: true, updated: res.rowCount ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to apply bulk action", detail: err?.message || "DB error" }, { status: 500 });
  }
}

*/

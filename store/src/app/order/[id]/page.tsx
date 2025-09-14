import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";

async function fetchOrder(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STORE_BASE_URL ?? "http://localhost:3002"}/api/orders/${id}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function OrderSuccessPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const data = await fetchOrder(id);
  if (!data) return null;
  const { order, items } = data as { order: any; items: Array<any> };
  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[960px] px-3 md:px-6 py-3 md:py-6">
        <h1 className="text-base md:text-xl font-semibold text-gray-900 mb-3">
          Thank you! Order #{order.order_number ?? order.id}
        </h1>
        <div className="text-sm text-gray-600 mb-3">
          Status: {order.status} | Payment: {order.payment_status}
        </div>
        <div className="grid gap-2 mb-3">
          {items.map((i, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <div className="h-12 w-12 bg-gray-50 rounded overflow-hidden">
                {i.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={i.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-2">
                  {i.product_name}
                </div>
                {Array.isArray(i.attrs) && (
                  <div className="text-xs text-gray-500">
                    {i.attrs
                      .map((a: any) => `${a.attribute} ${a.value}`)
                      .join(" • ")}
                  </div>
                )}
                <div className="text-xs text-gray-500">Qty {i.quantity}</div>
              </div>
              <div className="text-sm font-semibold whitespace-nowrap">
                {i.product_price} {order.currency}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-sm">Total</div>
          <div className="text-base font-semibold">
            {order.total_amount} {order.currency}
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  );
}

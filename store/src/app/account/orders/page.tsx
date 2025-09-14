import Header from "@/components/Header";
import { fetchMyOrders } from "@/lib/api";

export default async function OrdersPage() {
  const { items } = await fetchMyOrders();
  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[960px] px-3 md:px-6 py-4">
        <h1 className="text-lg md:text-xl font-semibold mb-4">My Orders</h1>
        {items.length === 0 ? (
          <div className="text-sm text-gray-600">You have no orders.</div>
        ) : (
          <div className="grid gap-3">
            {items.map((o) => (
              <a
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="border rounded-lg p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {(o.item_previews || []).slice(0, 2).map((p, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 rounded-md border bg-gray-50 overflow-hidden"
                        >
                          {p?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {Array.isArray(o.item_previews) &&
                      o.item_previews.length > 2 && (
                        <div className="h-6 min-w-6 px-1 rounded-full bg-gray-100 border text-[10px] flex items-center justify-center">
                          +{o.item_previews.length - 2}
                        </div>
                      )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      Order #{o.order_number}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>
                        Order: {o.status} • Payment: {o.payment_status}
                      </div>
                      {o.payment_method && (
                        <div>Payment Method: {o.payment_method}</div>
                      )}
                      {(o.shipping_method || o.tracking_number) && (
                        <div>
                          Shipping: {o.shipping_method || "-"}
                          {o.tracking_number
                            ? ` • Tracking: ${o.tracking_number}`
                            : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {o.total_amount} {o.currency}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

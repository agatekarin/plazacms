import Header from "@/components/Header";
import { fetchMyOrderDetail } from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { order, items } = await fetchMyOrderDetail(id);

  const subtotal = items.reduce(
    (s, it) => s + Number(it.product_price || 0) * Number(it.quantity || 0),
    0
  );
  const shipping = Number(order.shipping_cost || 0);

  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[960px] px-3 md:px-6 py-4">
        <h1 className="text-lg md:text-xl font-semibold mb-4">
          Order #{order.order_number}
        </h1>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Items</div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gray-50 rounded overflow-hidden">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-2">
                        {it.product_name}
                      </div>
                      {Array.isArray(it.attrs) && (
                        <div className="text-xs text-gray-500">
                          {it.attrs
                            .map((a) => `${a.attribute} ${a.value}`)
                            .join(" • ")}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Qty {it.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">
                      {it.product_price} {order.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Summary</div>
              <div className="text-sm flex justify-between">
                <span>Subtotal</span>
                <span>
                  {subtotal.toFixed(2)} {order.currency}
                </span>
              </div>
              <div className="text-sm flex justify-between">
                <span>Shipping</span>
                <span>
                  {shipping.toFixed(2)} {order.currency}
                </span>
              </div>
              <div className="text-sm flex justify-between font-semibold pt-2 border-t mt-2">
                <span>Total</span>
                <span>
                  {order.total_amount} {order.currency}
                </span>
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-medium mb-2">Status</div>
              <div className="text-sm">Order: {order.status}</div>
              <div className="text-sm">Payment: {order.payment_status}</div>
              {order.payment_method && (
                <div className="text-sm">
                  Payment Method: {order.payment_method}
                </div>
              )}
              {(order.shipping_method || order.tracking_number) && (
                <div className="text-sm">
                  Shipping: {order.shipping_method || "-"}
                  {order.tracking_number
                    ? ` • Tracking: ${order.tracking_number}`
                    : ""}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Placed on {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

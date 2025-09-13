"use client";

import { useCart } from "@/store/cart";
import Image from "next/image";

export default function CartDrawer() {
  const { isOpen, items, close, remove, total, setItems } = useCart();
  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-[92%] sm:w-[420px] bg-white shadow-xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Your Cart</h2>
          <button onClick={close} className="text-sm">
            Close
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[calc(100vh-170px)] overflow-auto">
          {items.length === 0 && (
            <p className="text-sm text-gray-500">Cart is empty.</p>
          )}
          {items.map((i) => (
            <div
              key={i.id}
              className="flex gap-3 items-center border rounded-lg p-2"
            >
              <div className="relative h-14 w-14 bg-gray-50 overflow-hidden rounded">
                {i.image ? (
                  <Image
                    src={i.image}
                    alt={i.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-400 text-[10px]">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{i.name}</p>
                {i.variantLabel && (
                  <p className="text-xs text-gray-500">{i.variantLabel}</p>
                )}
                <p className="text-xs text-gray-500">Qty {i.qty}</p>
              </div>
              <div className="ml-auto grid gap-1 text-right">
                <div className="text-sm font-semibold whitespace-nowrap">
                  {i.price * i.qty} {i.currency}
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <button
                    className="h-6 w-6 rounded border text-xs"
                    onClick={async () => {
                      const qty = Math.max(1, i.qty - 1);
                      const res = await fetch(`/api/cart/items/${i.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ qty }),
                      });
                      if (res.ok) {
                        setItems(
                          items.map((it) =>
                            it.id === i.id ? { ...it, qty } : it
                          )
                        );
                      }
                    }}
                  >
                    -
                  </button>
                  <button
                    className="h-6 w-6 rounded border text-xs"
                    onClick={async () => {
                      const qty = i.qty + 1;
                      const res = await fetch(`/api/cart/items/${i.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ qty }),
                      });
                      if (res.ok) {
                        setItems(
                          items.map((it) =>
                            it.id === i.id ? { ...it, qty } : it
                          )
                        );
                      }
                    }}
                  >
                    +
                  </button>
                  <button
                    onClick={() => remove(i.id)}
                    className="text-xs text-gray-500 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">
              {total()} {items[0]?.currency ?? ""}
            </span>
          </div>
          <a
            href="/checkout"
            className="h-11 rounded-lg bg-gray-900 text-white text-base grid place-items-center"
          >
            Checkout
          </a>
        </div>
      </aside>
    </div>
  );
}

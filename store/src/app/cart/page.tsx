"use client";

import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useEffect, useState } from "react";

export default function CartPage() {
  const [cart, setCart] = useState<{ items: any[]; subtotal: number } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) setCart(await res.json());
    })();
  }, []);

  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[960px] px-3 md:px-6 py-3 md:py-6">
        <h1 className="text-base md:text-xl font-semibold text-gray-900 mb-3">
          Cart
        </h1>
        {!cart || cart.items.length === 0 ? (
          <p className="text-sm text-gray-500">Your cart is empty.</p>
        ) : (
          <div className="grid gap-3">
            {cart.items.map((i) => (
              <div
                key={i.id}
                className="flex gap-3 items-center rounded-lg border px-3 py-2"
              >
                <div className="h-12 w-12 bg-gray-50 rounded overflow-hidden">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.image}
                      alt={i.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">
                    {i.name}
                  </div>
                  {i.variantLabel && (
                    <div className="text-xs text-gray-500">
                      {i.variantLabel}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">Qty {i.qty}</div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">
                  {i.price * i.qty} {i.currency}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-sm">Subtotal</div>
              <div className="text-base font-semibold">{cart.subtotal}</div>
            </div>
            <div className="flex justify-end">
              <a
                className="h-10 px-4 rounded-lg bg-gray-900 text-white inline-flex items-center"
                href="/checkout"
              >
                Checkout
              </a>
            </div>
          </div>
        )}
      </main>
      <BottomBar />
    </div>
  );
}

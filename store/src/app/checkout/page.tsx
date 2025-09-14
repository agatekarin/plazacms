"use client";

import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useEffect, useMemo, useState } from "react";
import CountrySelect from "@/components/CountrySelect";
import {
  fetchCart,
  fetchPaymentMethods,
  fetchShippingOptions,
  placeOrder,
  type PaymentMethod,
  type ShippingOption,
} from "@/lib/checkout";

export default function CheckoutPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<{ items: any[]; subtotal: number } | null>(
    null
  );
  const [address, setAddress] = useState({
    country_code: "ID",
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [shipping, setShipping] = useState<{
    options: ShippingOption[];
    selected?: ShippingOption;
  }>({ options: [] });
  const [payments, setPayments] = useState<{
    items: PaymentMethod[];
    selected?: PaymentMethod;
  }>({ items: [] });
  const total = useMemo(
    () => (cart ? cart.subtotal + (shipping.selected?.cost ?? 0) : 0),
    [cart, shipping.selected]
  );

  const isPayPalSelected = useMemo(
    () => payments.selected?.name?.toLowerCase().includes("paypal") ?? false,
    [payments.selected]
  );

  useEffect(() => {
    (async () => {
      const c = await fetchCart();
      setCart(c);
      const pm = await fetchPaymentMethods();
      setPayments({ items: pm.items });
    })();
  }, []);

  async function loadShipping() {
    const so = await fetchShippingOptions({
      country_code: address.country_code,
    });
    setShipping({ options: so.items, selected: so.items[0] });
  }

  async function onPlaceOrder() {
    if (!shipping.selected || !payments.selected) return;
    const payload = {
      shipping_address: address,
      shipping_method_id: shipping.selected.id,
      payment_method_id: payments.selected.id,
    };
    const res = await placeOrder(payload);
    const orderId = res.order_id as string;

    if (isPayPalSelected) {
      // Create PayPal order
      const createRes = await fetch("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!createRes.ok) throw new Error("Failed to create PayPal order");
      const { paypal_order_id } = await createRes.json();

      // Load JS SDK and render buttons in a dialog or inline simple flow using window.paypal
      const { loadScript } = await import("@paypal/paypal-js");
      const paypal = await loadScript({
        "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        intent: "capture",
        currency: cart?.items?.[0]?.currency || "USD",
      } as any);
      if (!paypal) throw new Error("Failed to load PayPal");

      // Open native popup immediately with existing orderId
      await new Promise<void>((resolve, reject) => {
        try {
          paypal
            .Buttons({
              createOrder: () => paypal_order_id,
              onApprove: async () => {
                const cap = await fetch("/api/payments/paypal/capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ paypal_order_id, order_id: orderId }),
                });
                if (!cap.ok) return reject(new Error("Capture failed"));
                resolve();
              },
              onError: (err: unknown) => reject(err as any),
              onCancel: () => reject(new Error("User canceled")),
            })
            .render("#paypal-inline-buttons");
        } catch (e) {
          reject(e as any);
        }
      });
    }

    window.location.href = `/order/${orderId}`;
  }

  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[960px] px-3 md:px-6 py-3 md:py-6">
        <h1 className="text-base md:text-xl font-semibold text-gray-900 mb-3">
          Checkout
        </h1>
        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className={step >= 1 ? "font-semibold" : "text-gray-400"}>
            1. Address
          </span>
          <span className="text-gray-300">/</span>
          <span className={step >= 2 ? "font-semibold" : "text-gray-400"}>
            2. Shipping
          </span>
          <span className="text-gray-300">/</span>
          <span className={step >= 3 ? "font-semibold" : "text-gray-400"}>
            3. Payment
          </span>
        </div>

        {step === 1 && (
          <section className="grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="h-10 px-3 rounded-lg border"
                placeholder="Full name"
                value={address.name}
                onChange={(e) =>
                  setAddress({ ...address, name: e.target.value })
                }
              />
              <input
                className="h-10 px-3 rounded-lg border"
                placeholder="Phone"
                value={address.phone}
                onChange={(e) =>
                  setAddress({ ...address, phone: e.target.value })
                }
              />
            </div>
            <input
              className="h-10 px-3 rounded-lg border"
              placeholder="Street address"
              value={address.street}
              onChange={(e) =>
                setAddress({ ...address, street: e.target.value })
              }
            />
            <div className="grid md:grid-cols-3 gap-3">
              <input
                className="h-10 px-3 rounded-lg border"
                placeholder="City"
                value={address.city}
                onChange={(e) =>
                  setAddress({ ...address, city: e.target.value })
                }
              />
              <input
                className="h-10 px-3 rounded-lg border"
                placeholder="State"
                value={address.state}
                onChange={(e) =>
                  setAddress({ ...address, state: e.target.value })
                }
              />
              <input
                className="h-10 px-3 rounded-lg border"
                placeholder="Postal Code"
                value={address.postal_code}
                onChange={(e) =>
                  setAddress({ ...address, postal_code: e.target.value })
                }
              />
            </div>
            <CountrySelect
              value={address.country_code}
              onChange={(code) =>
                setAddress({ ...address, country_code: code })
              }
            />
            <div className="flex justify-end">
              <button
                className="h-10 px-4 rounded-lg bg-gray-900 text-white"
                onClick={async () => {
                  await loadShipping();
                  setStep(2);
                }}
              >
                Continue to Shipping
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-3">
            <div className="grid gap-2">
              {shipping.options.map((o) => (
                <label
                  key={o.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${shipping.selected?.id === o.id ? "bg-gray-50 border-gray-900" : ""}`}
                >
                  <div>
                    <div className="text-sm font-medium">{o.name}</div>
                    {o.eta && (
                      <div className="text-xs text-gray-500">ETA {o.eta}</div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="ship"
                    checked={shipping.selected?.id === o.id}
                    onChange={() => setShipping({ ...shipping, selected: o })}
                  />
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {o.cost} {o.currency}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button
                className="h-10 px-4 rounded-lg border"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="h-10 px-4 rounded-lg bg-gray-900 text-white"
                onClick={() => setStep(3)}
              >
                Continue to Payment
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-3">
            {/* Order summary preview */}
            {cart && cart.items.length > 0 && (
              <div className="grid gap-2 border rounded-lg p-3">
                {cart.items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-50 rounded overflow-hidden">
                      {i.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={i.image}
                          alt=""
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
              </div>
            )}
            <div className="grid gap-2">
              {payments.items.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${payments.selected?.id === m.id ? "bg-gray-50 border-gray-900" : ""}`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {m.name}{" "}
                      <span className="text-xs text-gray-500">
                        ({m.gateway_name})
                      </span>
                    </div>
                    {m.description && (
                      <div className="text-xs text-gray-500">
                        {m.description}
                      </div>
                    )}
                  </div>
                  <input
                    type="radio"
                    name="pay"
                    checked={payments.selected?.id === m.id}
                    onChange={() => setPayments({ ...payments, selected: m })}
                  />
                </label>
              ))}
            </div>
            {isPayPalSelected && (
              <div id="paypal-inline-buttons" className="my-2" />
            )}
            <div className="flex justify-between items-center">
              <button
                className="h-10 px-4 rounded-lg border"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                className="h-10 px-4 rounded-lg bg-gray-900 text-white"
                onClick={onPlaceOrder}
              >
                Place Order
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Sticky total bar on mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t px-3 py-2 md:hidden flex items-center justify-between">
        <div className="text-sm">Total</div>
        <div className="text-base font-semibold">{total}</div>
      </div>

      <BottomBar />
    </div>
  );
}

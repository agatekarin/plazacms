export type ShippingOption = {
  id: string;
  name: string;
  cost: number;
  currency: string;
  eta?: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  gateway_name: string;
  settings: unknown;
  display_order: number;
};

export async function fetchCart() {
  const res = await fetch("/api/cart", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load cart");
  return (await res.json()) as { items: Array<any>; subtotal: number };
}

export async function fetchShippingOptions(params: { country_code: string }) {
  const res = await fetch("/api/checkout/shipping-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to load shipping options");
  return (await res.json()) as { items: ShippingOption[] };
}

export async function fetchPaymentMethods() {
  const res = await fetch("/api/checkout/payment-methods", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load payment methods");
  return (await res.json()) as { items: PaymentMethod[] };
}

export async function placeOrder(payload: {
  shipping_address: any;
  billing_address?: any;
  shipping_method_id: string;
  payment_method_id: string;
}) {
  const res = await fetch("/api/checkout/place-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    try {
      const body = await res.json();
      throw new Error(body?.error ?? "Failed to place order");
    } catch {
      throw new Error("Failed to place order");
    }
  }
  return await res.json();
}

export async function fetchCountries(q?: string) {
  const url = new URL(
    "/api/countries",
    typeof window === "undefined" ? "http://localhost" : window.location.origin
  );
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load countries");
  return (await res.json()) as { items: Array<{ iso2: string; name: string }> };
}

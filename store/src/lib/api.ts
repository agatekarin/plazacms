export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  regular_price: string;
  sale_price: string | null;
  currency: string;
  featured_image_url: string | null;
};

export type StoreProductDetail = StoreProduct & {
  description: string | null;
  stock: number;
};

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
};

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  const envUrl = process.env.NEXT_PUBLIC_STORE_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return "http://localhost:3002";
}

export async function fetchProducts(params?: {
  q?: string;
  limit?: number;
  offset?: number;
  category?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (typeof params?.limit === "number")
    search.set("limit", String(params.limit));
  if (typeof params?.offset === "number")
    search.set("offset", String(params.offset));
  if (params?.category) search.set("category", params.category);
  const qs = search.toString();
  const res = await fetch(`${getBaseUrl()}/api/products${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return (await res.json()) as {
    items: StoreProduct[];
    limit: number;
    offset: number;
  };
}

export async function fetchProductDetail(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/products/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch product detail");
  return (await res.json()) as StoreProductDetail;
}

export async function fetchCategories() {
  const res = await fetch(`${getBaseUrl()}/api/categories`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return (await res.json()) as { items: StoreCategory[] };
}

export type StoreOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  payment_method?: string;
  shipping_method?: string;
  shipping_provider?: string;
  tracking_number?: string;
  item_previews?: Array<{
    product_name: string;
    image_url: string | null;
  }> | null;
};

export async function fetchMyOrders() {
  // In server components, construct absolute URL and forward cookies manually
  if (typeof window === "undefined") {
    const { headers, cookies } = await import("next/headers");
    const h = headers();
    const host = (await h).get("host") || "localhost:3002";
    const proto = (await h).get("x-forwarded-proto") || "http";
    const ck = cookies();
    const all = await ck;
    const cookieHeader = all
      .getAll()
      .map((c: any) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(`${proto}://${host}/api/my/orders`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    } as any);
    if (!res.ok) throw new Error("Failed to fetch orders");
    return (await res.json()) as { items: StoreOrder[] };
  }
  const res = await fetch(`/api/my/orders`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return (await res.json()) as { items: StoreOrder[] };
}

export async function fetchMyOrderDetail(id: string) {
  if (typeof window === "undefined") {
    const { headers, cookies } = await import("next/headers");
    const h = headers();
    const host = (await h).get("host") || "localhost:3002";
    const proto = (await h).get("x-forwarded-proto") || "http";
    const ck = cookies();
    const all = await ck;
    const cookieHeader = all
      .getAll()
      .map((c: any) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(`${proto}://${host}/api/my/orders/${id}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    } as any);
    if (!res.ok) throw new Error("Failed to fetch order detail");
    return (await res.json()) as {
      order: any;
      items: Array<{
        product_name: string;
        product_price: string;
        quantity: number;
        image_url?: string | null;
        attrs?: Array<{ attribute: string; value: string }> | null;
      }>;
    };
  }
  const res = await fetch(`/api/my/orders/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch order detail");
  return (await res.json()) as {
    order: any;
    items: Array<{
      product_name: string;
      product_price: string;
      quantity: number;
      image_url?: string | null;
      attrs?: Array<{ attribute: string; value: string }> | null;
    }>;
  };
}

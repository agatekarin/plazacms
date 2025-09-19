"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type ProductOption = { value: string; label: string; image?: string | null };
type VariantOption = {
  value: string;
  label: string;
  price: number;
  image?: string | null;
  stock?: number;
};

interface OrderItem {
  product_name: string;
  product_price: number;
  quantity: number;
  product_variant_id: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}
interface ShippingMethodOption {
  id: string;
  name: string;
  zone_name?: string;
  gateway_name?: string;
}
interface AddressForm {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
}
interface CountryOption {
  iso2: string;
  name: string;
}

export default function OrderCreatePage() {
  const router = useRouter();
  const { apiCallJson, apiCall } = useAuthenticatedFetch();

  // Required
  const [userId, setUserId] = useState("");

  // Order fields
  const [status, setStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [currency, setCurrency] = useState("USD");
  const [shippingCost, setShippingCost] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);

  const [shippingAddress, setShippingAddress] = useState<AddressForm>({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country_code: "",
  });
  const [billingAddress, setBillingAddress] = useState<AddressForm>({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country_code: "",
  });

  // Options
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingMethods, setShippingMethods] = useState<
    ShippingMethodOption[]
  >([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const countryOptions: ComboboxOption[] = countries.map((c) => ({
    value: c.iso2,
    label: c.name,
  }));
  const shippingMethodOptions: ComboboxOption[] = shippingMethods.map((m) => ({
    value: m.id,
    label: `${m.name}${m.zone_name ? ` • ${m.zone_name}` : ""}${
      m.gateway_name ? ` • ${m.gateway_name}` : ""
    }`,
  }));

  // Product/Variants state
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [variantOptionsByProduct, setVariantOptionsByProduct] = useState<
    Record<string, VariantOption[]>
  >({});
  const [rowProductIds, setRowProductIds] = useState<Record<number, string>>(
    {}
  );

  // Load options
  useEffect(() => {
    (async () => {
      try {
        // Payment methods via gateways
        const gatewaysData: { items: { id: string; name: string }[] } =
          await apiCallJson("/api/admin/payments/gateways?enabled=true");
        const gateways = gatewaysData?.items || [];
        const methodLists = await Promise.all(
          gateways.map(async (g) => {
            try {
              const d = await apiCallJson(
                `/api/admin/payments/gateways/${g.id}/methods`
              );
              return { gateway: g, items: d.items || [] };
            } catch {
              return { gateway: g, items: [] as any[] };
            }
          })
        );
        const pm: PaymentMethod[] = [];
        for (const list of methodLists) {
          const gw = list.gateway?.name || "";
          for (const m of list.items)
            pm.push({ id: String(m.id), name: `${gw} • ${m.name}` });
        }
        setPaymentMethods(pm);

        // Shipping methods
        const sm = await apiCallJson(
          "/api/admin/shipping/methods?status=active&limit=200"
        );
        setShippingMethods(
          (sm.methods || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            zone_name: m.zone_name,
            gateway_name: m.gateway_name,
          }))
        );

        // Countries
        const c = await apiCallJson("/api/admin/locations/countries?limit=300");
        setCountries(c.countries || []);
      } catch {}
    })();
  }, [apiCallJson]);

  // Product search
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (productQuery) params.set("q", productQuery);
        params.set("pageSize", "20");
        const data = await apiCallJson(
          `/api/admin/products?${params.toString()}`,
          { cache: "no-store", signal: controller.signal }
        );
        const opts: ProductOption[] = (data.items || []).map((p: any) => ({
          value: String(p.id),
          label: p.name,
          image: p.featured_image_url || null,
        }));
        setProductOptions(opts);
      } catch {}
    })();
    return () => controller.abort();
  }, [productQuery, apiCallJson]);

  const ensureVariantsLoaded = async (productId: string) => {
    if (!productId || variantOptionsByProduct[productId]) return;
    try {
      const data = await apiCallJson(
        `/api/admin/products/${productId}/variants`,
        { cache: "no-store" }
      );
      const options: VariantOption[] = (data.items || []).map((v: any) => {
        const label = (v.attributes || [])
          .map((a: any) => `${a.value}`)
          .join(" • ");
        const price = Number(v.sale_price ?? v.regular_price ?? 0);
        return {
          value: String(v.id),
          label: label || v.sku || "Variant",
          price,
          image: v.image_url || null,
          stock: typeof v.stock === "number" ? v.stock : Number(v.stock || 0),
        };
      });
      setVariantOptionsByProduct((prev) => ({ ...prev, [productId]: options }));
    } catch {}
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_name: "",
        product_price: 0,
        quantity: 1,
        product_variant_id: "",
      },
    ]);
  };
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]:
        field === "product_price" || field === "quantity"
          ? Number(value)
          : value,
    };
    setItems(updated);
  };

  const totalAmount =
    items.reduce(
      (sum, it) => sum + (it.product_price || 0) * (it.quantity || 0),
      0
    ) + shippingCost;

  const handleCreate = async () => {
    try {
      if (!userId.trim()) {
        alert("Please input user_id");
        return;
      }
      // Basic required address presence
      if (!shippingAddress.country_code || !billingAddress.country_code) {
        alert("Please fill shipping & billing addresses");
        return;
      }
      const payload = {
        user_id: userId.trim(),
        status,
        currency,
        shipping_cost: shippingCost,
        tracking_number: trackingNumber || null,
        payment_status: paymentStatus,
        payment_method_id: paymentMethodId || null,
        shipping_zone_method_id: shippingMethodId || null,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        total_amount: totalAmount,
        items,
      };
      const res = await apiCall("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to create order");
      }
      const data = await res.json();
      router.push(`/admin/orders/${data.order.id}`);
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Create Order</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <XMarkIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            <CheckIcon className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Basics */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Order Basics</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID *
                </label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="user_id (UUID)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Cost
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) =>
                    setShippingCost(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Order Items</h2>
              <Button onClick={addItem} variant="outline" size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="py-2 pr-3 font-medium">Product</th>
                      <th className="py-2 px-3 font-medium w-80">Variant</th>
                      <th className="py-2 px-3 font-medium w-24">Qty</th>
                      <th className="py-2 px-3 font-medium w-28 text-right">
                        Price
                      </th>
                      <th className="py-2 pl-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => {
                      const activeProductId = rowProductIds[index];
                      const product = productOptions.find(
                        (p) => p.value === activeProductId
                      );
                      const variants = activeProductId
                        ? variantOptionsByProduct[activeProductId] || []
                        : [];
                      const selectedVar = variants.find(
                        (v) => v.value === item.product_variant_id
                      );
                      const thumb =
                        selectedVar?.image || product?.image || null;
                      return (
                        <tr key={index} className="align-middle">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-3">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt="thumb"
                                  className="w-12 h-12 rounded-md border object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-md border bg-gray-50" />
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {item.product_name ||
                                    product?.label ||
                                    "Select product"}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {selectedVar?.label || ""}
                                </div>
                                <div className="mt-2 w-72">
                                  <Input
                                    placeholder="Search products..."
                                    value={productQuery}
                                    onChange={(e) =>
                                      setProductQuery(e.target.value)
                                    }
                                    className="mb-2 h-9"
                                  />
                                  <Combobox
                                    value={activeProductId || ""}
                                    onChange={async (productId) => {
                                      setRowProductIds((prev) => ({
                                        ...prev,
                                        [index]: productId,
                                      }));
                                      await ensureVariantsLoaded(productId);
                                      updateItem(
                                        index,
                                        "product_variant_id",
                                        ""
                                      );
                                      const label =
                                        productOptions.find(
                                          (p) => p.value === productId
                                        )?.label || "";
                                      updateItem(index, "product_name", label);
                                      updateItem(index, "product_price", 0);
                                    }}
                                    options={productOptions.map((o) => ({
                                      value: o.value,
                                      label: o.label,
                                    }))}
                                    placeholder="Choose product"
                                    searchPlaceholder="Search products..."
                                    className="h-9"
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {activeProductId ? (
                              <Combobox
                                value={item.product_variant_id}
                                onChange={async (variantId) => {
                                  try {
                                    const data = await apiCallJson(
                                      `/api/admin/variants/${variantId}`,
                                      { cache: "no-store" }
                                    );
                                    const it = data.item || data;
                                    const price = Number(
                                      it.sale_price ?? it.regular_price ?? 0
                                    );
                                    updateItem(
                                      index,
                                      "product_variant_id",
                                      variantId
                                    );
                                    updateItem(
                                      index,
                                      "product_name",
                                      it.product_name || ""
                                    );
                                    updateItem(index, "product_price", price);
                                  } catch {}
                                }}
                                options={(
                                  variantOptionsByProduct[activeProductId] || []
                                ).map((o) => ({
                                  value: o.value,
                                  label: o.label || "Variant",
                                }))}
                                placeholder="Choose variant"
                                searchPlaceholder="Search variants..."
                                className="h-9 w-80"
                              />
                            ) : (
                              <div className="text-sm text-gray-500">
                                Choose product first
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 w-24">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-9"
                            />
                          </td>
                          <td className="py-3 px-3 w-28">
                            <div className="text-right tabular-nums">
                              {"$" + (item.product_price || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 pl-3 w-10">
                            <Button
                              onClick={() => removeItem(index)}
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 h-8 w-8"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Shipping & Tracking</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Method
                </label>
                <Combobox
                  value={shippingMethodId}
                  onChange={setShippingMethodId}
                  options={shippingMethodOptions}
                  placeholder="Select shipping method"
                  searchPlaceholder="Search shipping methods..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number
                </label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking number"
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Payment Method</h2>
            </div>
            <div className="p-6">
              <Select
                value={paymentMethodId}
                onValueChange={setPaymentMethodId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Addresses</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Shipping Address
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name"
                    value={shippingAddress.name}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        name: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Phone"
                    value={shippingAddress.phone}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        phone: e.target.value,
                      })
                    }
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Street"
                    value={shippingAddress.street}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        street: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="City"
                    value={shippingAddress.city}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        city: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="State"
                    value={shippingAddress.state}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        state: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Postal Code"
                    value={shippingAddress.postal_code}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        postal_code: e.target.value,
                      })
                    }
                  />
                  <Combobox
                    value={shippingAddress.country_code}
                    onChange={(v) =>
                      setShippingAddress({
                        ...shippingAddress,
                        country_code: v,
                      })
                    }
                    options={countryOptions}
                    placeholder="Country"
                    searchPlaceholder="Search country..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Billing Address
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name"
                    value={billingAddress.name}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        name: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Phone"
                    value={billingAddress.phone}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        phone: e.target.value,
                      })
                    }
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Street"
                    value={billingAddress.street}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        street: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="City"
                    value={billingAddress.city}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        city: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="State"
                    value={billingAddress.state}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        state: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="Postal Code"
                    value={billingAddress.postal_code}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        postal_code: e.target.value,
                      })
                    }
                  />
                  <Combobox
                    value={billingAddress.country_code}
                    onChange={(v) =>
                      setBillingAddress({ ...billingAddress, country_code: v })
                    }
                    options={countryOptions}
                    placeholder="Country"
                    searchPlaceholder="Search country..."
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

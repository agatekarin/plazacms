"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
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
import { CountrySelector } from "@/components/CountrySelector";
import { StateSelector } from "@/components/StateSelector";
import ProductPickerModal from "./ProductPickerModal";
import OrderItemCard from "./OrderItemCard";

type ProductOption = {
  value: string;
  label: string;
  image?: string | null;
};

type VariantOption = {
  value: string;
  label: string;
  price: number;
  image?: string | null;
  stock?: number;
};

interface OrderItem {
  id?: string;
  product_name: string;
  product_price: number;
  quantity: number;
  product_variant_id: string;
  variant_sku?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  shipping_cost: number;
  shipping_address: any;
  billing_address: any;
  payment_method?: string;
  tracking_number?: string;
  payment_method_id?: string;
  shipping_zone_method_id?: string;
  carrier_id?: string;
  items: OrderItem[];
}

interface OrderEditorProps {
  orderId: string;
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
  state_id: string;
  postal_code: string;
  country_code: string;
}

export default function OrderEditor({ orderId }: OrderEditorProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { apiCallJson, apiCall } = useAuthenticatedFetch();

  // Form states
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
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
    state_id: "",
    postal_code: "",
    country_code: "",
  });
  const [billingAddress, setBillingAddress] = useState<AddressForm>({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    state_id: "",
    postal_code: "",
    country_code: "",
  });

  // Options
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingMethods, setShippingMethods] = useState<
    ShippingMethodOption[]
  >([]);
  const shippingMethodOptions: ComboboxOption[] = shippingMethods.map((m) => ({
    value: m.id,
    label: `${m.name}${m.zone_name ? ` • ${m.zone_name}` : ""}${
      m.gateway_name ? ` • ${m.gateway_name}` : ""
    }`,
  }));

  // Product/Variant options for item picker
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [variantOptionsByProduct, setVariantOptionsByProduct] = useState<
    Record<string, VariantOption[]>
  >({});
  const [rowProductIds, setRowProductIds] = useState<Record<number, string>>(
    {}
  );

  // Product picker modal
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Variant cache for items
  const [variantDetails, setVariantDetails] = useState<
    Record<
      string,
      {
        value: string;
        label: string;
        price: number;
        image?: string | null;
        stock?: number;
      }
    >
  >({});

  // Track which variants are currently being loaded to prevent duplicate requests
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(
    new Set()
  );

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(`/api/admin/orders/${orderId}`);
      const orderData = data.order;

      setOrder(orderData);
      setStatus(orderData.status);
      setPaymentStatus(orderData.payment_status);
      setTotalAmount(orderData.total_amount);
      setShippingCost(orderData.shipping_cost || 0);
      setTrackingNumber(orderData.tracking_number || "");
      setPaymentMethodId(orderData.payment_method_id || "");
      setShippingMethodId(orderData.shipping_zone_method_id || "");
      setItems(
        (orderData.items || []).map((it: any) => ({
          ...it,
          product_price: Number(it.product_price ?? 0),
          quantity: Number(it.quantity ?? 1),
        }))
      );
      setShippingAddress({
        name: orderData.shipping_address?.name || "",
        phone: orderData.shipping_address?.phone || "",
        street: orderData.shipping_address?.street || "",
        city: orderData.shipping_address?.city || "",
        state: orderData.shipping_address?.state || "",
        state_id: orderData.shipping_address?.state_id || "",
        postal_code: orderData.shipping_address?.postal_code || "",
        country_code: orderData.shipping_address?.country_code || "",
      });
      setBillingAddress({
        name: orderData.billing_address?.name || "",
        phone: orderData.billing_address?.phone || "",
        street: orderData.billing_address?.street || "",
        city: orderData.billing_address?.city || "",
        state: orderData.billing_address?.state || "",
        state_id: orderData.billing_address?.state_id || "",
        postal_code: orderData.billing_address?.postal_code || "",
        country_code: orderData.billing_address?.country_code || "",
      });

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Hydrate per-item product/variant metadata and ensure options are available
  useEffect(() => {
    (async () => {
      if (!items?.length) return;

      // Only process items that haven't been hydrated yet
      for (let i = 0; i < items.length; i++) {
        const vId = items[i].product_variant_id;
        if (!vId || variantDetails[vId] || rowProductIds[i]) continue;

        try {
          const data = await apiCallJson(`/api/admin/variants/${vId}`);
          const it = data.item || data;
          const productId = String(it.product_id);

          // Track active product per index for UI
          setRowProductIds((prev) => ({ ...prev, [i]: productId }));

          // Ensure its variants loaded
          await ensureVariantsLoaded(productId);

          // Cache variant details for UI
          if (!variantDetails[vId]) {
            setVariantDetails((prev) => ({
              ...prev,
              [vId]: {
                value: vId,
                label:
                  it.attributes?.map((attr: any) => attr.value).join(" • ") ||
                  it.sku ||
                  "Default",
                price: Number(it.sale_price ?? it.regular_price ?? 0),
                image: it.image_url,
                stock: Number(it.stock || 0),
              },
            }));
          }

          // Only update missing item data to avoid loops
          const updates: Partial<OrderItem> = {};
          if (!items[i].product_name && it.product_name) {
            updates.product_name = it.product_name;
          }
          if (
            (!items[i].product_price || items[i].product_price === 0) &&
            (it.sale_price || it.regular_price)
          ) {
            updates.product_price = Number(
              it.sale_price ?? it.regular_price ?? 0
            );
          }

          // Batch update to avoid multiple state changes
          if (Object.keys(updates).length > 0) {
            setItems((prevItems) => {
              const newItems = [...prevItems];
              newItems[i] = { ...newItems[i], ...updates };
              return newItems;
            });
          }
        } catch {}
      }
    })();
  }, [items.length]);

  const fetchOptions = async () => {
    try {
      // Fetch payment gateways, then methods per gateway, and aggregate into payment methods
      const gatewaysData: { items: { id: string; name: string }[] } =
        await apiCallJson("/api/admin/payments/gateways?enabled=true");
      if (gatewaysData) {
        const gateways = gatewaysData.items || [];

        const methodLists = await Promise.all(
          gateways.map(async (g) => {
            try {
              const data = await apiCallJson(
                `/api/admin/payments/gateways/${g.id}/methods`
              );
              return { gateway: g, items: (data.items || []) as any[] };
            } catch {
              return { gateway: g, items: [] as any[] };
            }
          })
        );

        const methods: PaymentMethod[] = [];
        for (const list of methodLists) {
          const gatewayName = list.gateway?.name || "";
          for (const m of list.items) {
            methods.push({
              id: String(m.id),
              name: `${gatewayName} • ${m.name}`,
            });
          }
        }

        setPaymentMethods(methods);
      }

      // Fetch shipping methods
      {
        const smData = await apiCallJson(
          "/api/admin/shipping/methods?status=active&limit=200"
        );
        const methods: ShippingMethodOption[] = (smData.methods || []).map(
          (m: any) => ({
            id: m.id,
            name: m.name,
            zone_name: m.zone_name,
            gateway_name: m.gateway_name,
          })
        );
        setShippingMethods(methods);
      }

      // Countries are now handled by CountrySelector component
    } catch (err) {
      console.error("Failed to fetch options:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
    fetchOptions();
  }, [orderId]);

  // Ensure current shipping method exists in list (even if inactive), fetch label by ID
  useEffect(() => {
    const ensureShippingMethod = async () => {
      if (!shippingMethodId || !shippingMethods || shippingMethods.length === 0)
        return;
      const exists = shippingMethods.some((m) => m.id === shippingMethodId);
      if (exists) return;
      try {
        const data = await apiCallJson(
          `/api/admin/shipping/methods/${shippingMethodId}`
        );
        const m = data.method || data.item || data;
        if (m?.id) {
          setShippingMethods((prev) => [
            ...prev,
            {
              id: String(m.id),
              name: m.name,
              zone_name: m.zone_name,
              gateway_name: m.gateway_name,
            },
          ]);
        }
      } catch {
        // ignore fetch failure; keep placeholder
      }
    };
    ensureShippingMethod();
  }, [shippingMethodId, shippingMethods]);

  // Ensure current payment method exists in list; fall back to order.payment_method for label
  useEffect(() => {
    if (!paymentMethodId || !paymentMethods) return;
    const exists = paymentMethods.some((m) => m.id === paymentMethodId);
    if (exists) return;
    const fallbackLabel = order?.payment_method || "Current payment method";
    setPaymentMethods((prev) => [
      ...prev,
      { id: String(paymentMethodId), name: fallbackLabel },
    ]);
  }, [paymentMethodId, paymentMethods, order?.payment_method]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const updateData = {
        status,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        shipping_cost: shippingCost,
        tracking_number: trackingNumber,
        payment_method_id: paymentMethodId || null,
        shipping_zone_method_id: shippingMethodId || null,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        items,
      };

      const response = await apiCall(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update order");
      }

      // Redirect back to order detail
      router.push(`/admin/orders/${orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const addItems = (newItems: OrderItem[]) => {
    setItems((prev) => [...prev, ...newItems]);
    recalculateTotal([...items, ...newItems]);
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

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    recalculateTotal(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...items];
    const nextVal =
      field === "product_price" || field === "quantity" ? Number(value) : value;
    updatedItems[index] = { ...updatedItems[index], [field]: nextVal };
    setItems(updatedItems);

    if (field === "product_price" || field === "quantity") {
      recalculateTotal(updatedItems);
    }
  };

  const recalculateTotal = (currentItems: OrderItem[]) => {
    const itemsTotal = currentItems.reduce(
      (sum, item) => sum + item.product_price * item.quantity,
      0
    );
    setTotalAmount(itemsTotal + shippingCost);
  };

  // Load variant details for items
  const loadVariantDetails = async (variantIds: string[]) => {
    // Filter out variants that are already loaded or currently being loaded
    const toLoad = variantIds.filter(
      (id) => id && !variantDetails[id] && !loadingVariants.has(id)
    );

    if (toLoad.length === 0) return;

    // Mark variants as loading
    setLoadingVariants((prev) => new Set([...prev, ...toLoad]));

    const newDetails: Record<
      string,
      {
        value: string;
        label: string;
        price: number;
        image?: string | null;
        stock?: number;
      }
    > = {};

    // Load variants in parallel
    const loadPromises = toLoad.map(async (variantId) => {
      try {
        const data = await apiCallJson(`/api/admin/variants/${variantId}`);
        const variant = data.item || data;

        newDetails[variantId] = {
          value: variantId,
          label:
            variant.attributes?.map((attr: any) => attr.value).join(" • ") ||
            variant.sku ||
            "Default",
          price: Number(variant.sale_price ?? variant.regular_price ?? 0),
          image: variant.image_url,
          stock: Number(variant.stock || 0),
        };
      } catch (error) {
        console.error(`Failed to load variant ${variantId}:`, error);
      }
    });

    // Wait for all to complete
    await Promise.all(loadPromises);

    // Update state with all loaded variants
    if (Object.keys(newDetails).length > 0) {
      setVariantDetails((prev) => ({ ...prev, ...newDetails }));
    }

    // Clear loading state
    setLoadingVariants((prev) => {
      const next = new Set(prev);
      toLoad.forEach((id) => next.delete(id));
      return next;
    });
  };

  useEffect(() => {
    recalculateTotal(items);
  }, [shippingCost]);

  // Memoize variant IDs to prevent unnecessary recalculations
  const variantIds = useMemo(() => {
    return items.map((item) => item.product_variant_id).filter(Boolean);
  }, [items]);

  // Load variant details when items change
  useEffect(() => {
    // Only load variants that aren't already cached and not currently loading
    const missingVariantIds = variantIds.filter(
      (id) => !variantDetails[id] && !loadingVariants.has(id)
    );

    if (missingVariantIds.length > 0) {
      loadVariantDetails(missingVariantIds);
    }
  }, [variantIds.join(","), Object.keys(variantDetails).length]);

  // Fetch product list for picker when query changes
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
  }, [productQuery]);

  // Helper: load variants for a selected product
  const ensureVariantsLoaded = async (productId: string) => {
    if (!productId) return;
    if (variantOptionsByProduct[productId]) return;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading order...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
        <Button
          onClick={() => router.back()}
          className="mt-4"
          variant="outline"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Edit Order #{order?.order_number}
        </h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <XMarkIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <CheckIcon className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Order Status</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
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
                  <Select
                    value={paymentStatus}
                    onValueChange={setPaymentStatus}
                  >
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
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card>
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Order Items</h2>
                <Button
                  onClick={() => setIsProductPickerOpen(true)}
                  variant="outline"
                  size="sm"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Products
                </Button>
              </div>
            </div>
            <div className="p-6">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 text-gray-300 mx-auto mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No items in this order
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Add products to get started with this order.
                  </p>
                  <Button onClick={() => setIsProductPickerOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <OrderItemCard
                      key={`${item.product_variant_id}-${index}`}
                      item={item}
                      index={index}
                      productImage={
                        variantDetails[item.product_variant_id]?.image
                      }
                      variantLabel={
                        variantDetails[item.product_variant_id]?.label
                      }
                      stock={variantDetails[item.product_variant_id]?.stock}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              )}

              {/* Order Total */}
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) =>
                        setTotalAmount(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Items Subtotal
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={items.reduce(
                        (sum, item) => sum + item.product_price * item.quantity,
                        0
                      )}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping Information */}
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

          {/* Payment Information */}
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
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Addresses */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Addresses</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Shipping Address Form */}
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
                  <StateSelector
                    value={shippingAddress.state_id}
                    onValueChange={(value) =>
                      setShippingAddress({
                        ...shippingAddress,
                        state_id: value,
                      })
                    }
                    countryCode={shippingAddress.country_code}
                    placeholder="Select state..."
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
                  <div>
                    <CountrySelector
                      value={shippingAddress.country_code}
                      onValueChange={(v) =>
                        setShippingAddress({
                          ...shippingAddress,
                          country_code: v,
                          state_id: "", // Reset state when country changes
                        })
                      }
                      placeholder="Select country..."
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address Form */}
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
                  <StateSelector
                    value={billingAddress.state_id}
                    onValueChange={(value) =>
                      setBillingAddress({
                        ...billingAddress,
                        state_id: value,
                      })
                    }
                    countryCode={billingAddress.country_code}
                    placeholder="Select state..."
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
                  <div>
                    <CountrySelector
                      value={billingAddress.country_code}
                      onValueChange={(v) =>
                        setBillingAddress({
                          ...billingAddress,
                          country_code: v,
                          state_id: "", // Reset state when country changes
                        })
                      }
                      placeholder="Select country..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onAddItems={addItems}
      />
    </div>
  );
}

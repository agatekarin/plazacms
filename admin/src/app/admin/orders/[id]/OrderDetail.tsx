"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  TruckIcon,
  CreditCardIcon,
  UserIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ClockIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  variant_sku?: string;
  product_slug?: string;
  product_id?: string;
  has_review?: boolean;
}

interface Transaction {
  id: string;
  provider_transaction_id?: string;
  status: string;
  amount: number;
  currency: string;
  is_test: boolean;
  created_at: string;
  gateway_name: string;
  method_name?: string;
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
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email: string;
  payment_method_name?: string;
  carrier_name?: string;
  shipping_method_name?: string;
  items: OrderItem[];
  transactions: Transaction[];
}

interface OrderDetailProps {
  orderId: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const paymentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingReviewRequests, setSendingReviewRequests] = useState<
    Set<string>
  >(new Set());
  const { apiCallJson } = useAuthenticatedFetch();

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(`/api/admin/orders/${orderId}`);
      setOrder(data.order);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const sendReviewRequest = async (orderItemId: string) => {
    try {
      setSendingReviewRequests((prev) => new Set(prev).add(orderItemId));
      await apiCallJson(
        `/api/admin/orders/${orderId}/items/${orderItemId}/request-review`,
        {
          method: "POST",
        }
      );
      // Refresh order data to update review status
      await fetchOrder();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send review request"
      );
    } finally {
      setSendingReviewRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orderItemId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return "No address provided";
    return `${address.street_address || ""}, ${address.city || ""}, ${
      address.state || ""
    } ${address.postal_code || ""}, ${address.country || ""}`.replace(
      /^,\s*|,\s*$/g,
      ""
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading order details...</div>
      </div>
    );
  }

  if (error) {
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

  if (!order) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Order not found</p>
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

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.product_price * item.quantity,
    0
  );

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order #{order.order_number}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {formatDate(order.created_at)}
              </span>
              {order.updated_at !== order.created_at && (
                <span>Updated: {formatDate(order.updated_at)}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  statusColors[order.status as keyof typeof statusColors]
                }
              >
                {order.status}
              </Badge>
              <Badge
                className={
                  paymentStatusColors[
                    order.payment_status as keyof typeof paymentStatusColors
                  ]
                }
              >
                Payment: {order.payment_status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/admin/orders/${order.id}/edit`)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Order
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingBagIcon className="h-5 w-5" />
                Order Items ({order.items.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-3 border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      {item.variant_sku && (
                        <p className="text-sm text-gray-500">
                          SKU: {item.variant_sku}
                        </p>
                      )}
                      {order.status === "delivered" && item.product_id && (
                        <div className="mt-2">
                          {item.has_review ? (
                            <Badge className="bg-green-100 text-green-800">
                              Review Submitted
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReviewRequest(item.id)}
                              disabled={sendingReviewRequests.has(item.id)}
                              className="flex items-center gap-1"
                            >
                              <StarIcon className="h-3 w-3" />
                              {sendingReviewRequests.has(item.id)
                                ? "Sending..."
                                : "Request Review"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(item.product_price, order.currency)} ×{" "}
                        {item.quantity}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(
                          item.product_price * item.quantity,
                          order.currency
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal, order.currency)}</span>
                  </div>
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>
                        {formatCurrency(order.shipping_cost, order.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(order.total_amount, order.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Transactions */}
          {order.transactions.length > 0 && (
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5" />
                  Payment Transactions
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {order.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            {transaction.gateway_name}
                          </p>
                          {transaction.method_name && (
                            <p className="text-sm text-gray-500">
                              {transaction.method_name}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={
                            transaction.status === "succeeded"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Amount:</p>
                          <p className="font-medium">
                            {formatCurrency(
                              transaction.amount,
                              transaction.currency
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Transaction ID:</p>
                          <p className="font-mono text-xs">
                            {transaction.provider_transaction_id || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date:</p>
                          <p>{formatDate(transaction.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Environment:</p>
                          <p>{transaction.is_test ? "Test" : "Live"}</p>
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              router.push(
                                `/admin/transactions/${transaction.id}`
                              )
                            }
                          >
                            View Transaction
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Customer
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name:</p>
                  <p className="font-medium">
                    {order.customer_name || "Guest"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email:</p>
                  <p className="font-medium">{order.customer_email}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Shipping Information */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
                Shipping
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {order.shipping_method_name && (
                  <div>
                    <p className="text-sm text-gray-500">Method:</p>
                    <p className="font-medium">{order.shipping_method_name}</p>
                  </div>
                )}
                {order.carrier_name && (
                  <div>
                    <p className="text-sm text-gray-500">Carrier:</p>
                    <p className="font-medium">{order.carrier_name}</p>
                  </div>
                )}
                {order.tracking_number && (
                  <div>
                    <p className="text-sm text-gray-500">Tracking:</p>
                    <p className="font-mono text-sm">{order.tracking_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Address:</p>
                  <p className="text-sm">
                    {formatAddress(order.shipping_address)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Billing Information */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Billing
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {order.payment_method_name && (
                  <div>
                    <p className="text-sm text-gray-500">Payment Method:</p>
                    <p className="font-medium">{order.payment_method_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Address:</p>
                  <p className="text-sm">
                    {formatAddress(order.billing_address)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

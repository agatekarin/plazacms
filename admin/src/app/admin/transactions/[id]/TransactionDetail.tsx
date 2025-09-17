"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCardIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Refund {
  id: string;
  amount: number;
  reason?: string;
  provider_refund_id?: string;
  status: string;
  created_at: string;
  original_transaction_id?: string;
}

interface Transaction {
  id: string;
  provider_transaction_id?: string;
  status: string;
  amount: number;
  currency: string;
  is_test: boolean;
  meta?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  order_id: string;
  order_number: string;
  order_status: string;
  order_total: number;
  user_id: string;
  customer_name?: string;
  customer_email: string;
  gateway_name: string;
  gateway_slug: string;
  gateway_settings?: Record<string, unknown>;
  method_name?: string;
  refunds: Refund[];
}

interface TransactionDetailProps {
  transactionId: string;
}

const statusColors = {
  requires_action: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
  authorized: "bg-blue-100 text-blue-800",
  captured: "bg-purple-100 text-purple-800",
  succeeded: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  canceled: "bg-gray-100 text-gray-800",
  refunded: "bg-gray-100 text-gray-800",
};

const statusIcons = {
  requires_action: ExclamationTriangleIcon,
  pending: ClockIcon,
  authorized: CheckCircleIcon,
  captured: CheckCircleIcon,
  succeeded: CheckCircleIcon,
  failed: XCircleIcon,
  canceled: XCircleIcon,
  refunded: ArrowPathIcon,
};

export default function TransactionDetail({
  transactionId,
}: TransactionDetailProps) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Refund form
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const { apiCallJson } = useAuthenticatedFetch();

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(
        `/api/admin/transactions/${transactionId}`,
        {
          cache: "no-store",
        }
      );
      setTransaction(data.transaction);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

  const handleRefund = async () => {
    if (!transaction) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid refund amount");
      return;
    }

    const totalRefunded = transaction.refunds
      .filter((r) => r.status === "succeeded")
      .reduce((sum, r) => sum + r.amount, 0);

    if (amount > transaction.amount - totalRefunded) {
      alert(
        `Refund amount cannot exceed available balance: ${formatCurrency(
          transaction.amount - totalRefunded,
          transaction.currency
        )}`
      );
      return;
    }

    try {
      setRefundLoading(true);
      await apiCallJson("/api/admin/transactions/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount: amount,
          reason: refundReason || undefined,
          status: "pending",
        }),
      });

      // Reset form and refresh data
      setRefundAmount("");
      setRefundReason("");
      setShowRefundForm(false);
      fetchTransaction();

      alert("Refund initiated successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create refund");
    } finally {
      setRefundLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading transaction details...</div>
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

  if (!transaction) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Transaction not found</p>
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

  const StatusIcon =
    statusIcons[transaction.status as keyof typeof statusIcons];
  const txAmount = Number(transaction.amount || 0);
  const totalRefunded = transaction.refunds
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const availableForRefund = Math.max(txAmount - totalRefunded, 0);
  const canRefund =
    (transaction.status === "succeeded" || transaction.status === "captured") &&
    availableForRefund > 0;

  return (
    <div className="space-y-6">
      {/* Transaction Header */}
      <Card className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              Transaction {transaction.id.slice(-8)}
              <StatusIcon
                className={`h-6 w-6 ${
                  transaction.status === "succeeded"
                    ? "text-green-600"
                    : transaction.status === "failed"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              />
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {formatDate(transaction.created_at)}
              </span>
              {transaction.updated_at !== transaction.created_at && (
                <span>Updated: {formatDate(transaction.updated_at)}</span>
              )}
              {transaction.is_test && (
                <Badge className="bg-orange-100 text-orange-800">
                  TEST MODE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  statusColors[transaction.status as keyof typeof statusColors]
                }
              >
                {transaction.status}
              </Badge>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {canRefund && (
              <Button
                onClick={() => setShowRefundForm(!showRefundForm)}
                className="flex items-center gap-2"
                variant={showRefundForm ? "outline" : "primary"}
              >
                <ArrowPathIcon className="h-4 w-4" />
                {showRefundForm ? "Cancel Refund" : "Issue Refund"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Refund Form */}
      {showRefundForm && (
        <Card className="p-6 bg-orange-50 border-orange-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5" />
            Issue Refund
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Amount (Max:{" "}
                {formatCurrency(availableForRefund, transaction.currency)})
              </label>
              <Input
                type="number"
                step="0.01"
                max={availableForRefund}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Reason (Optional)
              </label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleRefund}
                disabled={refundLoading || !refundAmount}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                {refundLoading ? "Processing..." : "Process Refund"}
              </Button>
              <Button
                onClick={() => setShowRefundForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Details */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5" />
                Transaction Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">
                    Gateway Transaction ID:
                  </p>
                  <p className="font-mono text-sm mt-1">
                    {transaction.provider_transaction_id || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Internal ID:</p>
                  <p className="font-mono text-sm mt-1">{transaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gateway:</p>
                  <p className="font-medium mt-1">{transaction.gateway_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method:</p>
                  <p className="font-medium mt-1">
                    {transaction.method_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount:</p>
                  <p className="font-bold text-lg mt-1">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Environment:</p>
                  <p className="font-medium mt-1">
                    {transaction.is_test ? "Test" : "Live"}
                  </p>
                </div>
              </div>

              {/* PayPal Details (friendly) */}
              {transaction.gateway_slug === "paypal" && transaction.meta && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-base font-semibold mb-3">
                    PayPal Details
                  </h3>
                  {(() => {
                    const meta: any = transaction.meta || {};
                    const payer =
                      meta?.payer || meta?.payment_source?.paypal || {};
                    const pu = (meta?.purchase_units || [])[0] || {};
                    const captures = pu?.payments?.captures || [];
                    const cap = captures[0] || {};
                    const srb = cap?.seller_receivable_breakdown || {};
                    const gross = srb?.gross_amount || cap?.amount;
                    const fee = srb?.paypal_fee;
                    const net = srb?.net_amount;
                    const currency = (gross?.currency_code ||
                      transaction.currency) as string;
                    const fmt = (v?: {
                      value?: string;
                      currency_code?: string;
                    }) =>
                      v?.value
                        ? formatCurrency(
                            Number(v.value),
                            v.currency_code || currency
                          )
                        : "-";
                    const fullName =
                      payer?.name?.full_name ||
                      [payer?.name?.given_name, payer?.name?.surname]
                        .filter(Boolean)
                        .join(" ");
                    const status = (
                      cap?.status ||
                      meta?.status ||
                      transaction.status ||
                      ""
                    ).toLowerCase();
                    const StatusIconSmall =
                      statusIcons[
                        (status as keyof typeof statusIcons) || "captured"
                      ] || CheckCircleIcon;
                    const statusClass =
                      statusColors[
                        (status as keyof typeof statusColors) || "captured"
                      ] || "bg-green-100 text-green-800";

                    return (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Payer Name:</p>
                          <p className="font-medium">{fullName || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Payer Email:</p>
                          <p className="font-medium">
                            {payer?.email_address || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Payer ID:</p>
                          <p className="font-mono">
                            {payer?.payer_id || payer?.account_id || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Capture ID:</p>
                          <p className="font-mono">
                            {cap?.id ||
                              transaction.provider_transaction_id ||
                              "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-500">Status:</p>
                          <Badge className={statusClass}>
                            <StatusIconSmall className="h-4 w-4 mr-1" />
                            {(
                              cap?.status ||
                              meta?.status ||
                              transaction.status ||
                              ""
                            ).toLowerCase()}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-gray-500">Amount (Gross):</p>
                          <p className="font-semibold">{fmt(gross)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">PayPal Fee:</p>
                          <p className="font-medium">{fmt(fee)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Net Amount:</p>
                          <p className="font-medium">{fmt(net)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Created:</p>
                          <p>
                            {cap?.create_time
                              ? new Date(cap.create_time).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Updated:</p>
                          <p>
                            {cap?.update_time
                              ? new Date(cap.update_time).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex gap-3">
                            {Array.isArray(cap?.links) &&
                              cap.links.map((l: any) => {
                                const label =
                                  l.rel === "self"
                                    ? "View in PayPal"
                                    : l.rel === "refund"
                                    ? "Create Refund"
                                    : l.rel === "up"
                                    ? "View Order"
                                    : l.rel;
                                return (
                                  <a
                                    key={l.href}
                                    href={l.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    {label}
                                  </a>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Meta Data */}
              {transaction.meta && (
                <div className="mt-6 pt-6 border-t">
                  <details>
                    <summary className="cursor-pointer select-none text-sm text-gray-600 hover:text-gray-800">
                      Raw JSON (PayPal response)
                    </summary>
                    <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto mt-3">
                      {JSON.stringify(transaction.meta, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </Card>

          {/* Refunds */}
          {transaction.refunds.length > 0 && (
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowPathIcon className="h-5 w-5" />
                  Refunds ({transaction.refunds.length})
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {transaction.refunds.map((refund) => (
                    <div key={refund.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">
                            {formatCurrency(
                              refund.amount,
                              transaction.currency
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            ID: {refund.id.slice(-8)}
                          </p>
                        </div>
                        <Badge
                          className={
                            {
                              pending: "bg-yellow-100 text-yellow-800",
                              succeeded: "bg-green-100 text-green-800",
                              failed: "bg-red-100 text-red-800",
                            }[refund.status]
                          }
                        >
                          {refund.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Provider Refund ID:</p>
                          <p className="font-mono">
                            {refund.provider_refund_id || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date:</p>
                          <p>{formatDate(refund.created_at)}</p>
                        </div>
                        {refund.reason && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Reason:</p>
                            <p>{refund.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Refund Summary */}
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Refunded:</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(totalRefunded, transaction.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Available for Refund:</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(
                          availableForRefund,
                          transaction.currency
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Original Amount:</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Information */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingBagIcon className="h-5 w-5" />
                Related Order
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Order Number:</p>
                  <button
                    onClick={() =>
                      router.push(`/admin/orders/${transaction.order_id}`)
                    }
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    #{transaction.order_number}
                  </button>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Status:</p>
                  <p className="font-medium">{transaction.order_status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Total:</p>
                  <p className="font-medium">
                    {formatCurrency(
                      transaction.order_total,
                      transaction.currency
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>

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
                    {transaction.customer_name || "Guest"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email:</p>
                  <p className="font-medium">{transaction.customer_email}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <Button
                onClick={() =>
                  router.push(`/admin/orders/${transaction.order_id}`)
                }
                variant="outline"
                className="w-full justify-start"
              >
                <ShoppingBagIcon className="h-4 w-4 mr-2" />
                View Order
              </Button>
              <Button
                onClick={() => router.push("/admin/transactions/refunds")}
                variant="outline"
                className="w-full justify-start"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                View All Refunds
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

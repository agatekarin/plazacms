"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
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
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Transaction {
  id: string;
  provider_transaction_id?: string;
  status: string;
  amount: number;
  currency: string;
  is_test: boolean;
  created_at: string;
  updated_at: string;
  order_id: string;
  order_number: string;
  order_status: string;
  user_id: string;
  customer_name?: string;
  customer_email: string;
  gateway_name: string;
  gateway_slug: string;
  method_name?: string;
  refund_count?: number;
  refunded_amount?: number;
}

interface TransactionsManagerProps {
  initialStatus?: string;
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

export default function TransactionsManager({
  initialStatus = "",
}: TransactionsManagerProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters and pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [refundStats, setRefundStats] = useState<{
    count: number;
    sum: number;
  }>({ count: 0, sum: 0 });
  const { apiCallJson } = useAuthenticatedFetch();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) params.append("q", search);
      if (statusFilter) params.append("status", statusFilter);
      if (gatewayFilter) params.append("gateway", gatewayFilter);

      const data = await apiCallJson(`/api/admin/transactions?${params}`, {
        cache: "no-store",
      });
      setTransactions(data.items || []);
      setTotal(data.total || 0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundStats = async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "1",
        status: "succeeded",
      });
      const data = await apiCallJson(
        `/api/admin/transactions/refunds?${params}`,
        {
          cache: "no-store",
        }
      ).catch(() => null as any);
      if (!data) return;
      setRefundStats({
        count: Number(data.total || 0),
        sum: Number(data.sum || 0),
      });
    } catch {}
  };

  useEffect(() => {
    fetchTransactions();
    fetchRefundStats();
  }, [page, search, statusFilter, gatewayFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleGatewayFilter = (value: string) => {
    setGatewayFilter(value);
    setPage(1);
  };

  const handleRefund = async (transactionId: string, amount: number) => {
    const maxStr = Number(amount).toFixed(2);
    const refundAmount = prompt(`Enter refund amount (max: ${maxStr}):`);
    if (!refundAmount) return;

    const refundValue = parseFloat(refundAmount);
    if (isNaN(refundValue) || refundValue <= 0 || refundValue > amount) {
      alert("Invalid refund amount");
      return;
    }

    const reason = prompt("Enter refund reason (optional):") || "";

    try {
      // Call backend to perform refund (e.g., PayPal) and create refund record
      await apiCallJson("/api/admin/payments/paypal/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: transactions.find((t) => t.id === transactionId)?.order_id,
          amount: refundValue,
          reason: reason || undefined,
        }),
      });

      alert("Refund initiated successfully");
      fetchTransactions(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create refund");
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Filters and Search - professional dropdowns */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          {/* Search */}
          <div className="relative md:max-w-md w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search transactions..."
              className="pl-10"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {/* Status */}
            <div className="min-w-[200px]">
              <Select
                value={statusFilter || "all"}
                onValueChange={(v: string) =>
                  handleStatusFilter(v === "all" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="requires_action">
                    Requires Action
                  </SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="authorized">Authorized</SelectItem>
                  <SelectItem value="captured">Captured</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gateway */}
            <div className="min-w-[180px]">
              <Select
                value={gatewayFilter || "all"}
                onValueChange={(v: string) =>
                  handleGatewayFilter(v === "all" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gateways</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Successful</p>
              <p className="text-2xl font-semibold text-gray-900">
                {
                  transactions.filter(
                    (t) => t.status === "succeeded" || t.status === "captured"
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ArrowPathIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {transactions.filter((t) => t.status === "pending").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowPathIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {transactions.filter((t) => t.status === "failed").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ArrowPathIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Refunded</p>
              <p className="text-2xl font-semibold text-gray-900">
                {refundStats.count}
              </p>
              <p className="text-xs text-gray-500">
                Amount: {formatCurrency(refundStats.sum, "USD")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Transactions ({total})</h3>
            <Button
              onClick={() => router.push("/admin/transactions/refunds")}
              variant="outline"
            >
              View Refunds
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-6 border-b bg-red-50">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gateway
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ID: {transaction.id.slice(-8)}
                        </div>
                        {transaction.provider_transaction_id && (
                          <div className="text-sm text-gray-500 font-mono">
                            {transaction.provider_transaction_id}
                          </div>
                        )}
                        {transaction.refund_count &&
                          transaction.refund_count > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              Refunded:{" "}
                              {formatCurrency(
                                transaction.refunded_amount || 0,
                                transaction.currency
                              )}{" "}
                              ({transaction.refund_count})
                            </div>
                          )}
                        {transaction.is_test && (
                          <div className="text-xs text-orange-600 font-medium">
                            TEST MODE
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <button
                          onClick={() =>
                            router.push(`/admin/orders/${transaction.order_id}`)
                          }
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          #{transaction.order_number}
                        </button>
                        <div className="text-sm text-gray-500">
                          Status: {transaction.order_status}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.customer_name || "Guest"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.customer_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.gateway_name}
                        </div>
                        {transaction.method_name && (
                          <div className="text-sm text-gray-500">
                            {transaction.method_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          statusColors[
                            transaction.status as keyof typeof statusColors
                          ]
                        }
                      >
                        {transaction.status}
                      </Badge>
                      {transaction.refunded_amount &&
                        transaction.refunded_amount > 0 && (
                          <span className="ml-2 text-xs text-gray-600">
                            {transaction.refunded_amount >= transaction.amount
                              ? "(Fully refunded)"
                              : "(Partial refunded)"}
                          </span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/transactions/${transaction.id}`)
                        }
                        title="View Transaction"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      {(transaction.status === "succeeded" ||
                        transaction.status === "captured") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRefund(transaction.id, transaction.amount)
                          }
                          title="Refund Transaction"
                          className="text-orange-600 hover:text-orange-800"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {Math.min((page - 1) * pageSize + 1, total)} to{" "}
              {Math.min(page * pageSize, total)} of {total} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

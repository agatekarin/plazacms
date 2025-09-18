"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Refund {
  id: string;
  amount: number;
  reason?: string;
  provider_refund_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  transaction_id: string;
  provider_transaction_id?: string;
  transaction_amount: number;
  order_id: string;
  order_number: string;
  order_status: string;
  user_id: string;
  customer_name?: string;
  customer_email: string;
  gateway_name: string;
  gateway_slug: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  succeeded: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusIcons = {
  pending: ExclamationTriangleIcon,
  succeeded: CheckCircleIcon,
  failed: XCircleIcon,
};

export default function RefundsManager() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters and pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalRefundedAmount, setTotalRefundedAmount] = useState(0);
  const { apiCallJson } = useAuthenticatedFetch();

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) params.append("q", search);
      if (statusFilter) params.append("status", statusFilter);

      const data = await apiCallJson(
        `/api/admin/transactions/refunds?${params}`,
        {
          cache: "no-store",
        }
      );
      setRefunds(data.items || []);
      setTotal(data.total || 0);
      setTotalRefundedAmount(data.sum || 0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [page, search, statusFilter]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === "all" ? "" : value);
    setPage(1);
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
      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by refund ID, order number, or customer..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Select
              value={statusFilter || "all"}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => router.push("/admin/transactions")}
              variant="outline"
            >
              Back to Transactions
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowPathIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Refunds</p>
              <p className="text-2xl font-semibold text-gray-900">{total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Successful</p>
              <p className="text-2xl font-semibold text-gray-900">
                {refunds.filter((r) => r.status === "succeeded").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {refunds.filter((r) => r.status === "pending").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowPathIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Amount Refunded
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(totalRefundedAmount)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Refunds Table */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Refunds ({total})</h3>
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
                  Refund
                </th>
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
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
                    Loading refunds...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No refunds found
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => {
                  const StatusIcon =
                    statusIcons[refund.status as keyof typeof statusIcons];
                  return (
                    <tr key={refund.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ID: {refund.id.slice(-8)}
                          </div>
                          {refund.provider_refund_id && (
                            <div className="text-sm text-gray-500 font-mono">
                              {refund.provider_refund_id}
                            </div>
                          )}
                          {refund.reason && (
                            <div className="text-sm text-gray-500 mt-1">
                              Reason: {refund.reason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/transactions/${refund.transaction_id}`
                              )
                            }
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {refund.transaction_id.slice(-8)}
                          </button>
                          {refund.provider_transaction_id && (
                            <div className="text-sm text-gray-500 font-mono">
                              {refund.provider_transaction_id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <button
                            onClick={() =>
                              router.push(`/admin/orders/${refund.order_id}`)
                            }
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            #{refund.order_number}
                          </button>
                          <div className="text-sm text-gray-500">
                            Status: {refund.order_status}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {refund.customer_name || "Guest"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {refund.customer_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {refund.gateway_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(refund.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            of {formatCurrency(refund.transaction_amount)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={`h-4 w-4 ${
                              refund.status === "succeeded"
                                ? "text-green-600"
                                : refund.status === "failed"
                                ? "text-red-600"
                                : "text-yellow-600"
                            }`}
                          />
                          <Badge
                            className={
                              statusColors[
                                refund.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {refund.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(refund.created_at)}
                      </td>
                    </tr>
                  );
                })
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

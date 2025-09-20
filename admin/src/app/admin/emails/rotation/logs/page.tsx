"use client";

import React, { useEffect, useState } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import EmailRotationBreadcrumb from "@/components/EmailRotationBreadcrumb";
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface EmailLog {
  id: string;
  timestamp: string;
  provider_name: string;
  provider_type: "smtp" | "api";
  recipient: string;
  subject: string;
  status:
    | "success"
    | "failed"
    | "timeout"
    | "rate_limited"
    | "bounced"
    | "deferred";
  message_id?: string;
  response_time: number;
  error_code?: string;
  error_message?: string;
  rotation_strategy: string;
  was_fallback: boolean;
  attempt_number: number;
}

interface LogsData {
  logs: EmailLog[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  filters: {
    providers: Array<{ name: string; type: string; count: number }>;
    statuses: Array<{ status: string; count: number }>;
    date_range: { from: string; to: string };
  };
}

export default function EmailRotationLogs() {
  const [logsData, setLogsData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      console.error(`API Error on ${url}:`, error);
    },
  });

  const loadLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        search: searchTerm,
        status: statusFilter,
        provider: providerFilter,
        range: dateRange,
        per_page: "20",
      });

      const response = await apiCallJson(
        `/api/admin/email-rotation-config/logs?${params.toString()}`
      );

      if (response.success && response.data) {
        setLogsData(response.data);
      } else {
        // Mock data for now since backend doesn't exist yet
        const mockLogs: EmailLog[] = [
          {
            id: "1",
            timestamp: "2024-09-20T15:30:22Z",
            provider_name: "Resend Primary",
            provider_type: "api",
            recipient: "user@example.com",
            subject: "Welcome to PlazaCMS Demo!",
            status: "success",
            message_id: "re_abc123xyz",
            response_time: 285,
            rotation_strategy: "round_robin",
            was_fallback: false,
            attempt_number: 1,
          },
          {
            id: "2",
            timestamp: "2024-09-20T15:28:15Z",
            provider_name: "Brevo Marketing",
            provider_type: "api",
            recipient: "customer@domain.com",
            subject: "Order Confirmation #12345",
            status: "success",
            message_id: "brevo_def456",
            response_time: 445,
            rotation_strategy: "round_robin",
            was_fallback: false,
            attempt_number: 1,
          },
          {
            id: "3",
            timestamp: "2024-09-20T15:25:08Z",
            provider_name: "Mailjet Backup",
            provider_type: "api",
            recipient: "test@invalid-domain.xyz",
            status: "failed",
            response_time: 1250,
            error_code: "INVALID_EMAIL",
            error_message: "The recipient email address is invalid",
            rotation_strategy: "round_robin",
            was_fallback: false,
            attempt_number: 1,
            subject: "Newsletter Signup Confirmation",
          },
          {
            id: "4",
            timestamp: "2024-09-20T15:22:45Z",
            provider_name: "Gmail Primary SMTP",
            provider_type: "smtp",
            recipient: "admin@plazacms.com",
            subject: "System Alert: High Email Volume",
            status: "success",
            message_id: "smtp_ghi789",
            response_time: 3195,
            rotation_strategy: "weighted",
            was_fallback: true,
            attempt_number: 2,
          },
          {
            id: "5",
            timestamp: "2024-09-20T15:20:12Z",
            provider_name: "Resend Primary",
            provider_type: "api",
            recipient: "support@company.com",
            subject: "Password Reset Request",
            status: "rate_limited",
            response_time: 150,
            error_code: "RATE_LIMIT_EXCEEDED",
            error_message: "Daily sending limit reached for this provider",
            rotation_strategy: "round_robin",
            was_fallback: false,
            attempt_number: 1,
          },
        ];

        setLogsData({
          logs: mockLogs,
          pagination: {
            total: 127,
            page: 1,
            per_page: 20,
            total_pages: 7,
          },
          filters: {
            providers: [
              { name: "Resend Primary", type: "api", count: 45 },
              { name: "Brevo Marketing", type: "api", count: 36 },
              { name: "Mailjet Backup", type: "api", count: 18 },
              { name: "Gmail Primary SMTP", type: "smtp", count: 14 },
              { name: "Brevo SMTP", type: "smtp", count: 10 },
              { name: "Mailjet SMTP Account", type: "smtp", count: 4 },
            ],
            statuses: [
              { status: "success", count: 119 },
              { status: "failed", count: 5 },
              { status: "rate_limited", count: 2 },
              { status: "timeout", count: 1 },
            ],
            date_range: { from: "2024-09-13", to: "2024-09-20" },
          },
        });
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, searchTerm, statusFilter, providerFilter, dateRange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case "timeout":
        return <ClockIcon className="h-5 w-5 text-orange-600" />;
      case "rate_limited":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "success":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "failed":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "timeout":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "rate_limited":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "bounced":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "deferred":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setProviderFilter("all");
    setDateRange("7d");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <EmailRotationBreadcrumb />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailRotationBreadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            Email Rotation Logs
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor all email sending activities and troubleshoot delivery
            issues
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
              showFilters
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
          </button>

          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipients, subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {logsData?.filters.statuses.map((status) => (
                <option key={status.status} value={status.status}>
                  {status.status.charAt(0).toUpperCase() +
                    status.status.slice(1)}{" "}
                  ({status.count})
                </option>
              ))}
            </select>

            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Providers</option>
              {logsData?.filters.providers.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.name} ({provider.count})
                </option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {logsData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {logsData.pagination.total}
              </p>
              <p className="text-sm text-gray-600">Total Logs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {logsData.filters.statuses.find((s) => s.status === "success")
                  ?.count || 0}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {logsData.filters.statuses.find((s) => s.status === "failed")
                  ?.count || 0}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {logsData.filters.statuses.find(
                  (s) => s.status === "rate_limited"
                )?.count || 0}
              </p>
              <p className="text-sm text-gray-600">Rate Limited</p>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logsData?.logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className={getStatusBadge(log.status)}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            log.provider_type === "api"
                              ? "bg-blue-500"
                              : "bg-green-500"
                          }`}
                        ></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {log.provider_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.provider_type.toUpperCase()}
                            {log.was_fallback && " • Fallback"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 truncate max-w-xs">
                        {log.recipient}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 truncate max-w-xs">
                        {log.subject}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          log.response_time <= 500
                            ? "text-green-600"
                            : log.response_time <= 1000
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {log.response_time}ms
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          setExpandedLog(expandedLog === log.id ? null : log.id)
                        }
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {expandedLog === log.id ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {expandedLog === log.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700">
                                Message ID:
                              </p>
                              <p className="text-gray-600">
                                {log.message_id || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">
                                Strategy:
                              </p>
                              <p className="text-gray-600">
                                {log.rotation_strategy}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">
                                Attempt:
                              </p>
                              <p className="text-gray-600">
                                #{log.attempt_number}
                              </p>
                            </div>
                          </div>

                          {log.error_code && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="font-medium text-red-800">
                                Error Details:
                              </p>
                              <p className="text-red-700 text-sm">
                                <span className="font-medium">
                                  {log.error_code}:
                                </span>{" "}
                                {log.error_message}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logsData && logsData.pagination.total_pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage(Math.min(logsData.pagination.total_pages, page + 1))
                  }
                  disabled={page === logsData.pagination.total_pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(page - 1) * logsData.pagination.per_page + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(
                        page * logsData.pagination.per_page,
                        logsData.pagination.total
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {logsData.pagination.total}
                    </span>{" "}
                    results
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page numbers */}
                    {Array.from(
                      { length: Math.min(5, logsData.pagination.total_pages) },
                      (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pageNum
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}

                    <button
                      onClick={() =>
                        setPage(
                          Math.min(logsData.pagination.total_pages, page + 1)
                        )
                      }
                      disabled={page === logsData.pagination.total_pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

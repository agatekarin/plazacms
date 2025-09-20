"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import Link from "next/link";
import { toast } from "react-hot-toast";
import EmailRotationBreadcrumb from "@/components/EmailRotationBreadcrumb";
import {
  ChartBarIcon,
  Cog6ToothIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  EyeIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface DashboardStats {
  overview: {
    total_emails_sent: number;
    success_rate: number;
    avg_response_time: number;
    active_providers: number;
    total_providers: number;
  };
  smtp_stats: {
    total_accounts: number;
    healthy_accounts: number;
    total_sent: number;
    avg_response_time: number;
  };
  api_stats: {
    total_providers: number;
    healthy_providers: number;
    total_sent: number;
    avg_response_time: number;
  };
  recent_activity: Array<{
    id: string;
    timestamp: string;
    provider_name: string;
    provider_type: "smtp" | "api";
    recipient: string;
    status: "success" | "failed";
    response_time: number;
  }>;
  provider_performance: Array<{
    name: string;
    type: "smtp" | "api";
    success_rate: number;
    total_sent: number;
    avg_response_time: number;
    is_healthy: boolean;
  }>;
}

interface RotationConfig {
  enabled: boolean;
  strategy: string;
  api_smtp_balance_ratio: number;
  include_api_providers: boolean;
}

export default function EmailRotationDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<RotationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "API request failed");
    },
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, configResponse] = await Promise.all([
        apiCallJson("/api/admin/email-rotation-config/stats"),
        apiCallJson("/api/admin/email-rotation-config"),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (configResponse.success && configResponse.data) {
        setConfig(configResponse.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      setRefreshing(true);
      const response = await apiCallJson(
        "/api/admin/email-rotation-config/stats"
      );
      if (response.success) {
        setStats(response.data);
        toast.success("Stats refreshed");
      }
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? "text-green-500" : "text-red-500";
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "smtp":
        return "📬";
      case "api":
        return "🚀";
      default:
        return "📧";
    }
  };

  const getProviderTypeColor = (type: string) => {
    switch (type) {
      case "smtp":
        return "bg-blue-50 text-blue-700";
      case "api":
        return "bg-green-50 text-green-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${Math.round(num)}%`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <EmailRotationBreadcrumb />

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              Email Rotation Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor and manage your hybrid email rotation system
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={refreshStats}
              disabled={refreshing}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-5 w-5" />
              )}
              Refresh
            </button>

            <Link
              href="/admin/emails/rotation/providers"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Manage Providers
            </Link>
          </div>
        </div>
      </div>

      {/* System Status Alert */}
      {config && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            config.enabled
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {config.enabled ? (
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            )}
            <div>
              <h3
                className={`font-medium ${
                  config.enabled ? "text-green-900" : "text-yellow-900"
                }`}
              >
                Email Rotation {config.enabled ? "Active" : "Inactive"}
              </h3>
              <p
                className={`text-sm ${
                  config.enabled ? "text-green-700" : "text-yellow-700"
                }`}
              >
                {config.enabled
                  ? `Using ${config.strategy} strategy with ${formatPercentage(
                      config.api_smtp_balance_ratio
                    )} API preference`
                  : "Email rotation system is currently disabled"}
              </p>
            </div>
            {!config.enabled && (
              <Link
                href="/admin/emails/rotation/config"
                className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Enable Now
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      {stats && stats.overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Emails Sent
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.overview.total_emails_sent || 0)}
                </p>
              </div>
              <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">Today's activity</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(stats.overview.success_rate || 0)}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              {(stats.overview.success_rate || 0) >= 95 ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">Excellent performance</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-yellow-600">Needs attention</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Response Time
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.overview.avg_response_time || 0}ms
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              {(stats.overview.avg_response_time || 0) <= 500 ? (
                <>
                  <BoltIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">Fast response</span>
                </>
              ) : (
                <>
                  <ArrowTrendingDownIcon className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-orange-600">Could be faster</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Providers
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.overview.active_providers || 0}/
                  {stats.overview.total_providers || 0}
                </p>
              </div>
              <ServerIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              {(stats.overview.active_providers || 0) ===
              (stats.overview.total_providers || 0) ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">All providers healthy</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-600">Some providers down</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* SMTP vs API Comparison */}
        {stats && stats.smtp_stats && stats.api_stats && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-600" />
                SMTP vs API Performance
              </h3>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">
                      SMTP Accounts
                    </span>
                    <span className="text-2xl">📬</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">
                        {stats.smtp_stats.total_accounts || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Healthy:</span>
                      <span className="font-medium text-green-600">
                        {stats.smtp_stats.healthy_accounts || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sent:</span>
                      <span className="font-medium">
                        {formatNumber(stats.smtp_stats.total_sent || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response:</span>
                      <span className="font-medium">
                        {stats.smtp_stats.avg_response_time || 0}ms
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-900">
                      API Providers
                    </span>
                    <span className="text-2xl">🚀</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">
                        {stats.api_stats.total_providers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Healthy:</span>
                      <span className="font-medium text-green-600">
                        {stats.api_stats.healthy_providers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sent:</span>
                      <span className="font-medium">
                        {formatNumber(stats.api_stats.total_sent || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response:</span>
                      <span className="font-medium">
                        {stats.api_stats.avg_response_time || 0}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-purple-600" />
              Quick Actions
            </h3>

            <div className="space-y-3">
              <Link
                href="/admin/emails/rotation/providers"
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Cog6ToothIcon className="h-5 w-5" />
                  <span className="font-medium">Manage Providers</span>
                </div>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded-full group-hover:bg-blue-200">
                  {stats?.overview.total_providers || 0}
                </span>
              </Link>

              <Link
                href="/admin/emails/rotation/config"
                className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                  <span className="font-medium">Configure Rotation</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    config?.enabled
                      ? "bg-green-100 group-hover:bg-green-200"
                      : "bg-yellow-100 group-hover:bg-yellow-200"
                  }`}
                >
                  {config?.enabled ? "ON" : "OFF"}
                </span>
              </Link>

              <button
                onClick={() => {
                  /* TODO: Navigate to analytics */
                }}
                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-3 rounded-lg flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-5 w-5" />
                  <span className="font-medium">View Analytics</span>
                </div>
                <EyeIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => {
                  /* TODO: Navigate to logs */
                }}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-lg flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-5 w-5" />
                  <span className="font-medium">View Logs</span>
                </div>
                <EyeIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Provider Performance */}
        {stats && stats.provider_performance && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ServerIcon className="h-5 w-5 text-orange-600" />
                Top Performers
              </h3>

              <div className="space-y-3">
                {stats.provider_performance
                  .slice(0, 5)
                  .map((provider, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {getProviderIcon(provider.type)}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {provider.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProviderTypeColor(
                                provider.type
                              )}`}
                            >
                              {provider.type.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1">
                              {provider.is_healthy ? (
                                <CheckCircleIcon className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-3 w-3 text-red-500" />
                              )}
                              <span
                                className={`text-xs ${
                                  provider.is_healthy
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {provider.is_healthy ? "Healthy" : "Down"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          {formatPercentage(provider.success_rate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatNumber(provider.total_sent)} sent
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {stats.provider_performance.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ServerIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-sm">No provider data available</p>
                  <Link
                    href="/admin/emails/rotation/providers"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add providers
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {stats && stats.recent_activity && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-green-600" />
              Recent Email Activity
            </h3>
          </div>

          {stats.recent_activity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recent_activity.slice(0, 10).map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getProviderIcon(activity.provider_type)}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {activity.provider_name}
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full inline-flex items-center ${getProviderTypeColor(
                                activity.provider_type
                              )}`}
                            >
                              {activity.provider_type.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {activity.recipient.length > 30
                          ? `${activity.recipient.substring(0, 30)}...`
                          : activity.recipient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            activity.status === "success"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {activity.status === "success" ? (
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {activity.response_time}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No recent activity
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Email activity will appear here once emails are sent.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

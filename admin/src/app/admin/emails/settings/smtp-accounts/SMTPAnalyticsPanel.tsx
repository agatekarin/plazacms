"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Mail,
  AlertCircle,
  CheckCircle,
  BarChart3,
  RefreshCw,
  Calendar,
  Server,
  Zap,
  Settings,
  Play,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

interface AccountStats {
  account_name: string;
  host: string;
  is_active: boolean;
  is_healthy: boolean;
  today_sent_count: number;
  daily_limit: number;
  total_emails: number;
  successful_emails: number;
  failed_emails: number;
  avg_response_time: number;
  last_used: string | null;
  consecutive_failures: number;
}

interface HealthOverview {
  total_accounts: number;
  healthy_accounts: number;
  accounts_with_failures: number;
  unused_accounts: number;
}

interface RotationStats {
  period_days: number;
  accounts: AccountStats[];
  total_emails: number;
  total_successful: number;
  total_failed: number;
  health_overview: HealthOverview;
  rotation?: {
    accounts: AccountStats[];
    total_emails: number;
    total_successful: number;
  };
}

export default function SMTPAnalyticsPanel() {
  const [stats, setStats] = useState<RotationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState<string | null>(
    null
  );

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`SMTP Analytics Error on ${url}:`, error);
    },
  });

  const loadAnalytics = async () => {
    if (!loading) setRefreshing(true);

    try {
      const response = await apiCallJson(
        `/api/admin/smtp-accounts/stats/overview?days=${periodDays}`
      );

      if (response.success) {
        setStats(response.data);
      } else {
        console.error("Failed to load analytics:", response.error);
        setStats(null);
      }
    } catch (error) {
      console.error("Error loading SMTP analytics:", error);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [periodDays]);

  // Maintenance Operations
  const runMaintenanceOperation = async (
    operation: string,
    endpoint: string,
    successMessage: string
  ) => {
    setMaintenanceLoading(operation);
    try {
      const response = await apiCallJson(
        `/api/admin/smtp-accounts/maintenance/${endpoint}`,
        {
          method: endpoint === "rate-limits" ? "GET" : "POST",
        }
      );

      if (response.success) {
        toast.success(successMessage);

        // Show rate limit details if it's a rate limit check
        if (operation === "rate-limits" && response.data) {
          const { exceeded_accounts, near_limit_accounts } = response.data;
          if (exceeded_accounts?.length > 0) {
            toast.error(
              `⚠️ ${exceeded_accounts.length} accounts exceeded limits!`
            );
          }
          if (near_limit_accounts?.length > 0) {
            toast(`⚠️ ${near_limit_accounts.length} accounts near limits`, {
              icon: "⚠️",
              style: {
                borderLeft: "4px solid #f59e0b",
                backgroundColor: "#fef3c7",
                color: "#92400e",
              },
            });
          }
        }

        // Refresh analytics after maintenance operations
        setTimeout(() => {
          loadAnalytics();
        }, 1000);
      } else {
        throw new Error(response.error || `Failed to run ${operation}`);
      }
    } catch (error) {
      console.error(`Maintenance ${operation} error:`, error);
      toast.error(`Failed to run ${operation}`);
    } finally {
      setMaintenanceLoading(null);
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    // Handle null, undefined, or invalid numbers
    if (num == null || isNaN(num)) {
      return "0";
    }

    const safeNum = Number(num);
    if (safeNum >= 1000000) {
      return (safeNum / 1000000).toFixed(1) + "M";
    }
    if (safeNum >= 1000) {
      return (safeNum / 1000).toFixed(1) + "K";
    }
    return safeNum.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getSuccessRate = (successful: number, total: number) => {
    if (total === 0) return 100;
    return Math.round((successful / total) * 100);
  };

  const getPerformanceBadge = (avgTime: number) => {
    if (avgTime === 0) return <Badge variant="outline">No data</Badge>;
    if (avgTime < 1000)
      return <Badge variant="success">Fast ({avgTime}ms)</Badge>;
    if (avgTime < 3000)
      return <Badge variant="warning">Medium ({avgTime}ms)</Badge>;
    return <Badge variant="danger">Slow ({avgTime}ms)</Badge>;
  };

  const getHealthBadge = (account: AccountStats) => {
    if (!account.is_active) {
      return <Badge variant="outline">Inactive</Badge>;
    }
    if (!account.is_healthy) {
      return <Badge variant="danger">Unhealthy</Badge>;
    }
    if (account.consecutive_failures > 0) {
      return (
        <Badge variant="warning">
          Warning ({account.consecutive_failures} failures)
        </Badge>
      );
    }
    return <Badge variant="success">Healthy</Badge>;
  };

  const getUsageBadge = (sent: number, limit: number) => {
    const percentage = (sent / limit) * 100;
    if (percentage >= 90)
      return <Badge variant="danger">{percentage.toFixed(1)}%</Badge>;
    if (percentage >= 70)
      return <Badge variant="warning">{percentage.toFixed(1)}%</Badge>;
    return <Badge variant="success">{percentage.toFixed(1)}%</Badge>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Failed to Load Analytics
          </h3>
          <p className="mt-2 text-gray-600">
            Unable to retrieve SMTP account statistics.
          </p>
          <Button onClick={loadAnalytics} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              SMTP Analytics Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Performance metrics and usage statistics for the last {periodDays}{" "}
              days
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <Button
              variant="outline"
              onClick={loadAnalytics}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Emails</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(
                  stats.rotation?.total_emails || stats.total_emails
                )}
              </p>
            </div>
            <Mail className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {periodDays} day period
            </Badge>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {getSuccessRate(
                  stats.rotation?.total_successful || stats.total_successful,
                  stats.rotation?.total_emails || stats.total_emails
                )}
                %
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2">
            <Badge variant="success" className="text-xs">
              {formatNumber(
                stats.rotation?.total_successful || stats.total_successful
              )}{" "}
              successful
            </Badge>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Accounts</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.accounts.filter((acc) => acc.is_active).length}
              </p>
            </div>
            <Server className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {stats.accounts.filter((acc) => acc.is_healthy).length} healthy
            </Badge>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.accounts.length > 0
                  ? Math.round(
                      stats.accounts.reduce(
                        (sum, acc) => sum + (acc.avg_response_time || 0),
                        0
                      ) / stats.accounts.length
                    )
                  : 0}
                ms
              </p>
            </div>
            <Zap className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Account Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Account Performance
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Detailed statistics for each SMTP account
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Today
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.accounts.map((account, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {account.account_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.host}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {getHealthBadge(account)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {account.today_sent_count} / {account.daily_limit}
                    </div>
                    <div className="mt-1">
                      {getUsageBadge(
                        account.today_sent_count,
                        account.daily_limit
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPerformanceBadge(
                      Math.round(account.avg_response_time || 0)
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {account.total_emails > 0 ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {getSuccessRate(
                              account.successful_emails,
                              account.total_emails
                            )}
                            %
                          </div>
                          <div className="ml-2 text-xs text-gray-500">
                            ({account.successful_emails}/{account.total_emails})
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No data</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(account.last_used)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load Balancing Insights */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Load Balancing Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Distribution Analysis
            </h4>
            <div className="space-y-2">
              {stats.accounts
                .filter((acc) => acc.total_emails > 0)
                .sort((a, b) => b.total_emails - a.total_emails)
                .map((account, index) => {
                  const percentage =
                    stats.total_emails > 0
                      ? (account.total_emails / stats.total_emails) * 100
                      : 0;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-600 truncate flex-1">
                        {account.account_name}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Health Overview
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Healthy Accounts</span>
                <Badge variant="success">
                  {stats.health_overview?.healthy_accounts || 0} /{" "}
                  {stats.health_overview?.total_accounts || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Accounts with Failures
                </span>
                <Badge variant="warning">
                  {stats.health_overview?.accounts_with_failures || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Unused Accounts</span>
                <Badge variant="outline">
                  {stats.health_overview?.unused_accounts || 0}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Services & Maintenance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-600" />
          Background Services & Maintenance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() =>
              runMaintenanceOperation(
                "health-check",
                "health-check",
                "✅ Health check completed"
              )
            }
            disabled={maintenanceLoading === "health-check"}
            className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
          >
            {maintenanceLoading === "health-check" ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <Activity className="h-5 w-5 text-green-500" />
            )}
            <span className="text-sm font-medium">Health Check</span>
            <span className="text-xs text-gray-500 text-center">
              Test all SMTP connections
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              runMaintenanceOperation(
                "reset-counters",
                "reset-counters",
                "🔄 Counters reset successfully"
              )
            }
            disabled={maintenanceLoading === "reset-counters"}
            className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
          >
            {maintenanceLoading === "reset-counters" ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <RefreshCw className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm font-medium">Reset Counters</span>
            <span className="text-xs text-gray-500 text-center">
              Reset daily/hourly counters
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              runMaintenanceOperation(
                "rate-limits",
                "rate-limits",
                "📊 Rate limits checked"
              )
            }
            disabled={maintenanceLoading === "rate-limits"}
            className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
          >
            {maintenanceLoading === "rate-limits" ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <BarChart3 className="h-5 w-5 text-orange-500" />
            )}
            <span className="text-sm font-medium">Check Limits</span>
            <span className="text-xs text-gray-500 text-center">
              Monitor rate limiting status
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              runMaintenanceOperation(
                "cleanup",
                "cleanup",
                "🧹 Cleanup completed"
              )
            }
            disabled={maintenanceLoading === "cleanup"}
            className="flex items-center gap-2 h-auto py-3 px-4 flex-col"
          >
            {maintenanceLoading === "cleanup" ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <Trash2 className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">Cleanup</span>
            <span className="text-xs text-gray-500 text-center">
              Clean old logs & health checks
            </span>
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Background Services
              </h4>
              <p className="text-xs text-blue-700">
                These services normally run automatically in the background
                every few minutes. Use these manual controls for immediate
                maintenance or troubleshooting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

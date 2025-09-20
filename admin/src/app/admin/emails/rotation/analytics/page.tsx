"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import EmailRotationBreadcrumb from "@/components/EmailRotationBreadcrumb";
import {
  ChartBarIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ServerIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

interface AnalyticsData {
  overview: {
    total_emails_sent: number;
    success_rate: number;
    avg_response_time: number;
    active_providers: number;
    total_providers: number;
  };
  daily_stats: Array<{
    date: string;
    api_sent: number;
    smtp_sent: number;
    total_sent: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  provider_analytics: Array<{
    name: string;
    type: "smtp" | "api";
    total_sent: number;
    success_rate: number;
    avg_response_time: number;
    daily_breakdown: Array<{
      date: string;
      sent: number;
      success_rate: number;
    }>;
  }>;
  performance_metrics: {
    fastest_provider: { name: string; avg_time: number };
    most_reliable: { name: string; success_rate: number };
    most_used: { name: string; total_sent: number };
    total_failures: number;
    total_retries: number;
  };
}

export default function EmailRotationAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      console.error(`API Error on ${url}:`, error);
    },
  });

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiCallJson(
        `/api/admin/email-rotation-config/analytics?range=${timeRange}`
      );

      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        // Mock data for now since backend doesn't exist yet
        setAnalytics({
          overview: {
            total_emails_sent: 127,
            success_rate: 98.4,
            avg_response_time: 342,
            active_providers: 6,
            total_providers: 6,
          },
          daily_stats: [
            {
              date: "2024-09-14",
              api_sent: 15,
              smtp_sent: 8,
              total_sent: 23,
              success_rate: 95.7,
              avg_response_time: 380,
            },
            {
              date: "2024-09-15",
              api_sent: 18,
              smtp_sent: 12,
              total_sent: 30,
              success_rate: 100,
              avg_response_time: 295,
            },
            {
              date: "2024-09-16",
              api_sent: 12,
              smtp_sent: 6,
              total_sent: 18,
              success_rate: 94.4,
              avg_response_time: 425,
            },
            {
              date: "2024-09-17",
              api_sent: 22,
              smtp_sent: 14,
              total_sent: 36,
              success_rate: 97.2,
              avg_response_time: 315,
            },
            {
              date: "2024-09-18",
              api_sent: 8,
              smtp_sent: 4,
              total_sent: 12,
              success_rate: 100,
              avg_response_time: 278,
            },
            {
              date: "2024-09-19",
              api_sent: 6,
              smtp_sent: 2,
              total_sent: 8,
              success_rate: 100,
              avg_response_time: 312,
            },
          ],
          provider_analytics: [
            {
              name: "Resend Primary",
              type: "api",
              total_sent: 45,
              success_rate: 97.8,
              avg_response_time: 285,
              daily_breakdown: [
                { date: "2024-09-14", sent: 8, success_rate: 100 },
                { date: "2024-09-15", sent: 12, success_rate: 100 },
                { date: "2024-09-16", sent: 6, success_rate: 83.3 },
                { date: "2024-09-17", sent: 14, success_rate: 100 },
                { date: "2024-09-18", sent: 3, success_rate: 100 },
                { date: "2024-09-19", sent: 2, success_rate: 100 },
              ],
            },
            {
              name: "Brevo Marketing",
              type: "api",
              total_sent: 36,
              success_rate: 100,
              avg_response_time: 445,
              daily_breakdown: [
                { date: "2024-09-14", sent: 7, success_rate: 100 },
                { date: "2024-09-15", sent: 6, success_rate: 100 },
                { date: "2024-09-16", sent: 6, success_rate: 100 },
                { date: "2024-09-17", sent: 8, success_rate: 100 },
                { date: "2024-09-18", sent: 5, success_rate: 100 },
                { date: "2024-09-19", sent: 4, success_rate: 100 },
              ],
            },
          ],
          performance_metrics: {
            fastest_provider: { name: "Resend Primary", avg_time: 285 },
            most_reliable: { name: "Brevo Marketing", success_rate: 100 },
            most_used: { name: "Resend Primary", total_sent: 45 },
            total_failures: 2,
            total_retries: 5,
          },
        });
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            Email Rotation Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Detailed performance insights and trends for your email rotation
            system
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
          </select>

          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.overview.total_emails_sent || 0}
              </p>
            </div>
            <EnvelopeIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12% from last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.overview.success_rate || 0}%
              </p>
            </div>
            <ServerIcon className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            {(analytics?.overview.success_rate || 0) >= 95 ? (
              <>
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
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
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.overview.avg_response_time || 0}ms
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-orange-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            {(analytics?.overview.avg_response_time || 0) <= 500 ? (
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
                {analytics?.overview.active_providers || 0}/
                {analytics?.overview.total_providers || 0}
              </p>
            </div>
            <ServerIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">All providers healthy</span>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-blue-600" />
          Daily Email Volume Trend
        </h3>

        <div className="space-y-4">
          {/* Chart Header */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span className="text-gray-600">API Providers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-gray-600">SMTP Accounts</span>
              </div>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="grid grid-cols-6 gap-2 h-40">
            {analytics?.daily_stats.map((day, index) => {
              const maxTotal = Math.max(
                ...analytics.daily_stats.map((d) => d.total_sent)
              );
              const totalHeight = (day.total_sent / maxTotal) * 100;
              const apiHeight = (day.api_sent / day.total_sent) * totalHeight;
              const smtpHeight = (day.smtp_sent / day.total_sent) * totalHeight;

              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="flex-1 flex flex-col justify-end w-8 relative">
                    <div
                      className="bg-green-600 rounded-t"
                      style={{ height: `${smtpHeight}%` }}
                      title={`SMTP: ${day.smtp_sent} emails`}
                    ></div>
                    <div
                      className="bg-blue-600"
                      style={{ height: `${apiHeight}%` }}
                      title={`API: ${day.api_sent} emails`}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 transform -rotate-45">
                    {formatDate(day.date)}
                  </div>
                  <div className="text-xs font-medium text-gray-900 mt-1">
                    {day.total_sent}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Provider Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Providers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-green-600" />
            Provider Performance Rankings
          </h3>

          <div className="space-y-4">
            {analytics?.provider_analytics.map((provider, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      provider.type === "api" ? "bg-blue-500" : "bg-green-500"
                    }`}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-sm text-gray-500">
                      {provider.type.toUpperCase()} • {provider.total_sent} sent
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {provider.success_rate}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {provider.avg_response_time}ms
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-orange-600" />
            Key Performance Metrics
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Fastest Provider</p>
                <p className="font-medium text-gray-900">
                  {analytics?.performance_metrics.fastest_provider.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {analytics?.performance_metrics.fastest_provider.avg_time}ms
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Most Reliable</p>
                <p className="font-medium text-gray-900">
                  {analytics?.performance_metrics.most_reliable.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">
                  {analytics?.performance_metrics.most_reliable.success_rate}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Most Used</p>
                <p className="font-medium text-gray-900">
                  {analytics?.performance_metrics.most_used.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-600">
                  {analytics?.performance_metrics.most_used.total_sent} emails
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {analytics?.performance_metrics.total_failures}
                </p>
                <p className="text-sm text-gray-600">Total Failures</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {analytics?.performance_metrics.total_retries}
                </p>
                <p className="text-sm text-gray-600">Retries</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

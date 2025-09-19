/**
 * Email Analytics Dashboard
 * Charts, metrics, and performance tracking for email system
 */

"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  AlertTriangle,
  CheckCircle,
  Users,
  Send,
  BarChart3,
  Calendar,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";

// Types
interface EmailAnalytics {
  overview: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  chartData: {
    daily: Array<{
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }>;
    campaigns: Array<{
      name: string;
      sent: number;
      opened: number;
      clicked: number;
    }>;
  };
  topTemplates: Array<{
    template_name: string;
    sent_count: number;
    open_rate: number;
    click_rate: number;
  }>;
  recentEvents: Array<{
    event_type: string;
    recipient_email: string;
    template_name?: string;
    created_at: string;
  }>;
}

interface TimeFilter {
  value: string;
  label: string;
  days: number;
}

const TIME_FILTERS: TimeFilter[] = [
  { value: "7", label: "Last 7 Days", days: 7 },
  { value: "30", label: "Last 30 Days", days: 30 },
  { value: "90", label: "Last 90 Days", days: 90 },
  { value: "365", label: "Last Year", days: 365 },
];

// Loading Component
function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  format?: "number" | "percentage";
  color?: "green" | "red" | "blue" | "orange";
}

function MetricCard({
  title,
  value,
  change,
  icon,
  format = "number",
  color = "blue",
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (format === "percentage") {
      return typeof val === "number" ? `${val.toFixed(1)}%` : val;
    }
    return typeof val === "number" ? val.toLocaleString() : val;
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "text-green-600 bg-green-100";
      case "red":
        return "text-red-600 bg-red-100";
      case "orange":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center ${getColorClasses(
            color
          )}`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(value)}
        </div>
        {typeof change === "number" && (
          <div className="flex items-center text-xs text-gray-600 mt-1">
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
            )}
            <span className={change >= 0 ? "text-green-600" : "text-red-600"}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="ml-1">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Chart Component (could be enhanced with Chart.js or Recharts)
interface SimpleChartProps {
  data: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

function SimpleChart({ data }: SimpleChartProps) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.sent, d.delivered, d.opened, d.clicked))
  );

  return (
    <div className="h-64 p-4">
      <div className="flex items-end h-full space-x-2">
        {data.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col items-end space-y-1 h-full justify-end">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(day.sent / maxValue) * 100}%` }}
                title={`Sent: ${day.sent}`}
              />
              <div
                className="w-full bg-green-500"
                style={{ height: `${(day.delivered / maxValue) * 100}%` }}
                title={`Delivered: ${day.delivered}`}
              />
              <div
                className="w-full bg-yellow-500"
                style={{ height: `${(day.opened / maxValue) * 100}%` }}
                title={`Opened: ${day.opened}`}
              />
              <div
                className="w-full bg-purple-500 rounded-b"
                style={{ height: `${(day.clicked / maxValue) * 100}%` }}
                title={`Clicked: ${day.clicked}`}
              />
            </div>
            <div className="text-xs text-gray-600 mt-2 text-center">
              {new Date(day.date).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-4 mt-4 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
          <span>Sent</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
          <span>Delivered</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
          <span>Opened</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
          <span>Clicked</span>
        </div>
      </div>
    </div>
  );
}

// Main Analytics Component
export default function EmailAnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState("30");
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      toast.error(error?.message || "Failed to fetch analytics");
    },
  });

  const fetchAnalytics = async (days: string = timeFilter) => {
    setLoading(true);
    try {
      const data = await apiCallJson(
        `/api/admin/emails/analytics?days=${days}`
      );
      console.log("API Response:", data); // Debug log
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      console.log("Using fallback mock data"); // Debug log
      // Set mock data for development
      setAnalytics({
        overview: {
          totalSent: 1247,
          delivered: 1198,
          opened: 456,
          clicked: 89,
          bounced: 23,
          unsubscribed: 12,
          deliveryRate: 96.1,
          openRate: 38.1,
          clickRate: 19.5,
          bounceRate: 1.9,
        },
        chartData: {
          daily: Array.from({ length: parseInt(days) }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (parseInt(days) - 1 - i));
            return {
              date: date.toISOString().split("T")[0],
              sent: Math.floor(Math.random() * 50) + 10,
              delivered: Math.floor(Math.random() * 45) + 8,
              opened: Math.floor(Math.random() * 20) + 3,
              clicked: Math.floor(Math.random() * 8) + 1,
            };
          }),
          campaigns: [
            { name: "Welcome Series", sent: 456, opened: 234, clicked: 67 },
            { name: "Newsletter", sent: 789, opened: 345, clicked: 89 },
            { name: "Product Updates", sent: 234, opened: 123, clicked: 34 },
          ],
        },
        topTemplates: [
          {
            template_name: "Welcome Email",
            sent_count: 456,
            open_rate: 45.2,
            click_rate: 12.3,
          },
          {
            template_name: "Order Confirmation",
            sent_count: 234,
            open_rate: 67.8,
            click_rate: 23.1,
          },
          {
            template_name: "Newsletter",
            sent_count: 789,
            open_rate: 34.5,
            click_rate: 8.9,
          },
        ],
        recentEvents: [
          {
            event_type: "opened",
            recipient_email: "user@example.com",
            template_name: "Welcome Email",
            created_at: "2024-01-15T10:30:00Z",
          },
          {
            event_type: "clicked",
            recipient_email: "customer@test.com",
            template_name: "Newsletter",
            created_at: "2024-01-15T10:25:00Z",
          },
          {
            event_type: "delivered",
            recipient_email: "admin@local.com",
            template_name: "Order Confirmation",
            created_at: "2024-01-15T10:20:00Z",
          },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  if (!analytics) {
    return (
      <PageContainer>
        <AnalyticsLoading />
      </PageContainer>
    );
  }

  // Safety check for data structure
  if (!analytics.overview) {
    console.error("Invalid analytics structure:", analytics);
    return (
      <PageContainer>
        <div className="p-8 text-center">
          <p className="text-red-600">
            Analytics data structure error. Check console for details.
          </p>
        </div>
      </PageContainer>
    );
  }

  const data = analytics;

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Email Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor email performance, engagement, and delivery metrics
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={timeFilter}
              onValueChange={(value) => setTimeFilter(value)}
            >
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/admin/emails/history">
                <BarChart3 className="h-4 w-4 mr-2" />
                View History
              </Link>
            </Button>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Sent"
            value={data.overview?.totalSent || 0}
            icon={<Send className="h-4 w-4" />}
            color="blue"
          />
          <MetricCard
            title="Delivery Rate"
            value={data.overview?.deliveryRate || 0}
            icon={<CheckCircle className="h-4 w-4" />}
            format="percentage"
            color="green"
          />
          <MetricCard
            title="Open Rate"
            value={data.overview?.openRate || 0}
            icon={<Eye className="h-4 w-4" />}
            format="percentage"
            color="blue"
          />
          <MetricCard
            title="Click Rate"
            value={data.overview?.clickRate || 0}
            icon={<MousePointer className="h-4 w-4" />}
            format="percentage"
            color="orange"
          />
        </div>

        {/* Charts and Tables */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="events">Recent Events</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Email Performance Over Time
                </CardTitle>
                <CardDescription>
                  Daily email metrics for the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleChart data={data.chartData?.daily || []} />
              </CardContent>
            </Card>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Delivered"
                value={data.overview?.delivered || 0}
                icon={<CheckCircle className="h-4 w-4" />}
                color="green"
              />
              <MetricCard
                title="Opened"
                value={data.overview?.opened || 0}
                icon={<Eye className="h-4 w-4" />}
                color="blue"
              />
              <MetricCard
                title="Clicked"
                value={data.overview?.clicked || 0}
                icon={<MousePointer className="h-4 w-4" />}
                color="orange"
              />
              <MetricCard
                title="Bounced"
                value={data.overview?.bounced || 0}
                icon={<AlertTriangle className="h-4 w-4" />}
                color="red"
              />
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Top Performing Templates
                </CardTitle>
                <CardDescription>
                  Email templates ranked by engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data.topTemplates || []).map((template, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {template?.template_name || "Unknown Template"}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {(template?.sent_count || 0).toLocaleString()} emails
                          sent
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {(template?.open_rate || 0).toFixed(1)}%
                          </div>
                          <div className="text-gray-600">Open Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {(template?.click_rate || 0).toFixed(1)}%
                          </div>
                          <div className="text-gray-600">Click Rate</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Campaign Performance
                </CardTitle>
                <CardDescription>
                  Email campaign engagement statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data.chartData?.campaigns || []).map((campaign, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {campaign?.name || "Unknown Campaign"}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {(campaign?.sent || 0).toLocaleString()} recipients
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {(campaign?.opened || 0).toLocaleString()}
                          </div>
                          <div className="text-gray-600">Opened</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {(campaign?.clicked || 0).toLocaleString()}
                          </div>
                          <div className="text-gray-600">Clicked</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">
                            {(
                              ((campaign?.opened || 0) /
                                (campaign?.sent || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                          <div className="text-gray-600">Rate</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Recent Email Events
                </CardTitle>
                <CardDescription>
                  Latest email interactions and delivery events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data.recentEvents || []).map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            event?.event_type === "opened"
                              ? "default"
                              : event?.event_type === "clicked"
                              ? "danger"
                              : "secondary"
                          }
                        >
                          {event?.event_type || "unknown"}
                        </Badge>
                        <div>
                          <div className="font-medium text-gray-900">
                            {event?.recipient_email || "Unknown Email"}
                          </div>
                          {event?.template_name && (
                            <div className="text-sm text-gray-600">
                              {event.template_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {event?.created_at
                          ? new Date(event.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Unknown Date"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}

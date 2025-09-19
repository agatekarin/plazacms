/**
 * Email Management Dashboard
 * Overview of email system with quick actions and recent activity
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
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
  Mail,
  Send,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  BarChart3,
  MessageSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";

// Loading components
function EmailStatsLoading() {
  return (
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
  );
}

function RecentEmailsLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export default function EmailDashboardPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Email Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage email templates, campaigns, and monitor delivery
              performance
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/admin/emails/send">
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/emails/templates">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Link>
            </Button>
          </div>
        </div>

        {/* Email Statistics */}
        <EmailStats />

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common email management tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/admin/emails/test">
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </Link>
              </Button>

              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/admin/emails/templates">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Manage Templates
                </Link>
              </Button>

              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/admin/emails/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>

              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/admin/emails/history">
                  <Clock className="h-4 w-4 mr-2" />
                  Email History
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <RecentEmails />
        </div>

        {/* Email Templates Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                Email Templates
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/emails/templates">View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmailTemplatesPreview />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// Email Statistics Component
function EmailStats() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error("EmailStats API Error:", error);
    },
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await apiCallJson("/api/admin/emails/analytics?days=30");
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch email analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [apiCallJson]);

  if (loading) {
    return <EmailStatsLoading />;
  }

  if (!analytics?.overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">No email data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview } = analytics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Sent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          <Send className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(overview.totalSent || 0).toLocaleString()}
          </div>
          <p className="text-xs text-green-600 flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            Real-time data
          </p>
        </CardContent>
      </Card>

      {/* Delivery Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.deliveryRate || 0}%
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {(overview.delivered || 0).toLocaleString()} delivered
          </p>
        </CardContent>
      </Card>

      {/* Open Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          <Mail className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.openRate || 0}%</div>
          <p className="text-xs text-gray-600 mt-1">
            {(overview.opened || 0).toLocaleString()} opened
          </p>
        </CardContent>
      </Card>

      {/* Click Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
          <Users className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.clickRate || 0}%</div>
          <p className="text-xs text-gray-600 mt-1">
            {(overview.clicked || 0).toLocaleString()} clicks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Recent Emails Component
function RecentEmails() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error("RecentEmails API Error:", error);
    },
  });

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await apiCallJson(
          "/api/admin/emails/notifications?limit=5"
        );
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Failed to fetch email notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [apiCallJson]);

  if (loading) {
    return <RecentEmailsLoading />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="text-blue-600">
            Sent
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="text-green-600">
            Delivered
          </Badge>
        );
      case "opened":
        return (
          <Badge variant="outline" className="text-purple-600">
            Opened
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="text-red-600">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No recent email activity</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">{notification.subject}</p>
                <p className="text-xs text-gray-500">
                  To: {notification.recipient_email} •{" "}
                  {new Date(notification.created_at).toLocaleDateString()}{" "}
                  {new Date(notification.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {getStatusBadge(notification.status)}
            </div>
          ))
        )}

        <Button variant="ghost" className="w-full" asChild>
          <Link href="/admin/emails/history">View All Activity</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Email Templates Preview
function EmailTemplatesPreview() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error("EmailTemplatesPreview API Error:", error);
    },
  });

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await apiCallJson("/api/admin/emails/templates");
        setTemplates((data.templates || []).slice(0, 4)); // Show only 4 for preview
      } catch (error) {
        console.error("Failed to fetch email templates:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [apiCallJson]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "transactional":
        return "bg-blue-100 text-blue-700";
      case "marketing":
        return "bg-green-100 text-green-700";
      case "system":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No email templates found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{template.name}</h4>
            <div className="flex items-center gap-2">
              <Badge className={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
              {template.is_active ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Type:{" "}
            <code className="bg-gray-100 px-1 rounded">{template.type}</code>
          </p>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/emails/templates/${template.id}/edit`}>
                Edit
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/emails/templates/${template.id}/preview`}>
                Preview
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

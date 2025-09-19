/**
 * Email Management Dashboard
 * Overview of email system with quick actions and recent activity
 */

import { Suspense } from "react";
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
        <Suspense fallback={<EmailStatsLoading />}>
          <EmailStats />
        </Suspense>

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
          <Suspense fallback={<RecentEmailsLoading />}>
            <RecentEmails />
          </Suspense>
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
            <Suspense
              fallback={
                <div className="animate-pulse h-32 bg-gray-100 rounded"></div>
              }
            >
              <EmailTemplatesPreview />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// Email Statistics Component
async function EmailStats() {
  // In real app, fetch from API
  const mockStats = {
    totalSent: 1247,
    delivered: 1198,
    opened: 856,
    clicked: 134,
  };

  const deliveryRate = Math.round(
    (mockStats.delivered / mockStats.totalSent) * 100
  );
  const openRate = Math.round((mockStats.opened / mockStats.delivered) * 100);
  const clickRate = Math.round((mockStats.clicked / mockStats.opened) * 100);

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
            {mockStats.totalSent.toLocaleString()}
          </div>
          <p className="text-xs text-green-600 flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            +12% from last month
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
          <div className="text-2xl font-bold">{deliveryRate}%</div>
          <p className="text-xs text-gray-600 mt-1">
            {mockStats.delivered.toLocaleString()} delivered
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
          <div className="text-2xl font-bold">{openRate}%</div>
          <p className="text-xs text-gray-600 mt-1">
            {mockStats.opened.toLocaleString()} opened
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
          <div className="text-2xl font-bold">{clickRate}%</div>
          <p className="text-xs text-gray-600 mt-1">
            {mockStats.clicked.toLocaleString()} clicks
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Recent Emails Component
async function RecentEmails() {
  // Mock data - in real app, fetch from API
  const recentEmails = [
    {
      id: 1,
      subject: "Welcome to PlazaCMS!",
      recipient: "john@example.com",
      status: "sent",
      sentAt: "2024-01-15 10:30",
    },
    {
      id: 2,
      subject: "Order Confirmation #12345",
      recipient: "jane@example.com",
      status: "delivered",
      sentAt: "2024-01-15 09:15",
    },
    {
      id: 3,
      subject: "Review Request",
      recipient: "mike@example.com",
      status: "opened",
      sentAt: "2024-01-15 08:45",
    },
    {
      id: 4,
      subject: "Password Reset",
      recipient: "sara@example.com",
      status: "failed",
      sentAt: "2024-01-15 08:00",
    },
  ];

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
        {recentEmails.map((email) => (
          <div
            key={email.id}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{email.subject}</p>
              <p className="text-xs text-gray-500">
                To: {email.recipient} • {email.sentAt}
              </p>
            </div>
            {getStatusBadge(email.status)}
          </div>
        ))}

        <Button variant="ghost" className="w-full" asChild>
          <Link href="/admin/emails/history">View All Activity</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Email Templates Preview
async function EmailTemplatesPreview() {
  // Mock data - in real app, fetch from API
  const templates = [
    {
      id: 1,
      name: "Welcome Email",
      type: "welcome",
      category: "transactional",
      isActive: true,
    },
    {
      id: 2,
      name: "Order Confirmation",
      type: "order_confirmation",
      category: "transactional",
      isActive: true,
    },
    {
      id: 3,
      name: "Review Request",
      type: "review_request",
      category: "transactional",
      isActive: true,
    },
    {
      id: 4,
      name: "Newsletter Template",
      type: "newsletter",
      category: "marketing",
      isActive: false,
    },
  ];

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
              {template.isActive ? (
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

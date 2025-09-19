"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  TestTube,
  Server,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  TrendingUp,
  MoreVertical,
  ExternalLink,
} from "lucide-react";

interface SMTPAccount {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  username: string;
  encryption: string;
  weight: number;
  priority: number;
  daily_limit: number;
  hourly_limit: number;
  is_active: boolean;
  is_healthy: boolean;
  last_used_at?: string;
  consecutive_failures: number;
  total_success_count: number;
  total_failure_count: number;
  today_sent_count: number;
  current_hour_sent: number;
  daily_usage_percent: number;
  hourly_usage_percent: number;
  success_rate_percent?: number;
  tags: string[];
  from_email?: string;
  from_name?: string;
  created_at: string;
  updated_at: string;
}

interface SMTPAccountsListProps {
  accounts: SMTPAccount[];
  loading: boolean;
  onEdit: (account: SMTPAccount) => void;
  onDelete: (accountId: string) => void;
  onTest: (accountId: string, accountName: string) => void;
}

export default function SMTPAccountsList({
  accounts,
  loading,
  onEdit,
  onDelete,
  onTest,
}: SMTPAccountsListProps) {
  const [testingAccounts, setTestingAccounts] = useState<Set<string>>(
    new Set()
  );

  const handleTest = async (account: SMTPAccount) => {
    setTestingAccounts((prev) => new Set([...prev, account.id]));
    try {
      await onTest(account.id, account.name);
    } finally {
      setTestingAccounts((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const getHealthBadge = (account: SMTPAccount) => {
    if (!account.is_active) {
      return (
        <Badge variant="outline" className="text-gray-500">
          Inactive
        </Badge>
      );
    }

    if (!account.is_healthy) {
      return (
        <Badge variant="danger" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Unhealthy
        </Badge>
      );
    }

    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Healthy
      </Badge>
    );
  };

  const getUsageBadge = (
    percent: number | null | undefined,
    type: "daily" | "hourly"
  ) => {
    // Handle null, undefined, or invalid numbers
    if (percent == null || isNaN(percent)) {
      return <Badge variant="outline">0.0%</Badge>;
    }

    const safePercent = Number(percent);
    if (safePercent >= 90) {
      return <Badge variant="danger">{safePercent.toFixed(1)}%</Badge>;
    } else if (safePercent >= 70) {
      return <Badge variant="warning">{safePercent.toFixed(1)}%</Badge>;
    } else {
      return <Badge variant="success">{safePercent.toFixed(1)}%</Badge>;
    }
  };

  const getPriorityBadge = (priority: number | null | undefined) => {
    // Handle null, undefined, or invalid numbers
    if (priority == null || isNaN(priority)) {
      return <Badge variant="outline">Unknown (0)</Badge>;
    }

    const safePriority = Number(priority);
    if (safePriority <= 50) {
      return <Badge variant="primary">High ({safePriority})</Badge>;
    } else if (safePriority <= 100) {
      return <Badge variant="secondary">Medium ({safePriority})</Badge>;
    } else {
      return <Badge variant="outline">Low ({safePriority})</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading SMTP accounts...</span>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No SMTP accounts found
          </h3>
          <p className="mt-2 text-gray-600">
            Get started by adding your first SMTP account for load balancing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
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
                Configuration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {account.name}
                      </h4>
                      {account.tags.length > 0 && (
                        <div className="flex gap-1">
                          {account.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {account.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{account.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {account.host}:{account.port}
                    </p>
                    {account.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {account.description}
                      </p>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-2">
                    {getHealthBadge(account)}
                    {getPriorityBadge(account.priority)}
                    {account.consecutive_failures > 0 && (
                      <Badge variant="warning" className="text-xs">
                        {account.consecutive_failures} failures
                      </Badge>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      Encryption:{" "}
                      <span className="font-medium uppercase">
                        {account.encryption || "UNKNOWN"}
                      </span>
                    </div>
                    <div>
                      Weight:{" "}
                      <span className="font-medium">{account.weight || 0}</span>
                    </div>
                    <div>
                      Username:{" "}
                      <span className="font-mono">{account.username}</span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Daily:</span>
                      {getUsageBadge(account.daily_usage_percent, "daily")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Hourly:</span>
                      {getUsageBadge(account.hourly_usage_percent, "hourly")}
                    </div>
                    <div className="text-xs text-gray-400">
                      {account.today_sent_count} / {account.daily_limit} daily
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span>Success: {account.success_rate_percent || 0}%</span>
                    </div>
                    <div className="text-gray-500">
                      ✅ {account.total_success_count} | ❌{" "}
                      {account.total_failure_count}
                    </div>
                    <div className="text-gray-400">
                      Last used: {formatDate(account.last_used_at)}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(account)}
                      disabled={testingAccounts.has(account.id)}
                      className="p-2"
                      title="Test Connection"
                    >
                      {testingAccounts.has(account.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      ) : (
                        <TestTube className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(account)}
                      className="p-2"
                      title="Edit Account"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(account.id)}
                      className="p-2 text-red-600 hover:text-red-700"
                      title="Delete Account"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-gray-200">
        {accounts.map((account) => (
          <div key={account.id} className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  {account.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {account.host}:{account.port}
                </p>
                {account.description && (
                  <p className="text-xs text-gray-400 mt-1">
                    {account.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(account)}
                  disabled={testingAccounts.has(account.id)}
                  className="p-2"
                >
                  {testingAccounts.has(account.id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  ) : (
                    <TestTube className="h-3 w-3" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(account)}
                  className="p-2"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="mb-2">{getHealthBadge(account)}</div>
                <div className="mb-2">{getPriorityBadge(account.priority)}</div>
                <div className="text-xs text-gray-500">
                  Weight: {account.weight || 0} |{" "}
                  {account.encryption?.toUpperCase() || "UNKNOWN"}
                </div>
              </div>

              <div>
                <div className="mb-1">
                  <span className="text-xs text-gray-500">Daily: </span>
                  {getUsageBadge(account.daily_usage_percent, "daily")}
                </div>
                <div className="mb-1">
                  <span className="text-xs text-gray-500">Success: </span>
                  <Badge variant="outline" className="text-xs">
                    {account.success_rate_percent || 0}%
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">
                  {account.today_sent_count} / {account.daily_limit} emails
                </div>
              </div>
            </div>

            {account.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {account.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

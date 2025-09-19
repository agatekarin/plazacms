"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  RefreshCw,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Mail,
  Activity,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import SMTPAccountsList from "./SMTPAccountsList";
import SMTPAccountModal from "./SMTPAccountModal";
import SMTPAnalyticsPanel from "./SMTPAnalyticsPanel";
import SMTPConfigModal from "./SMTPConfigModal";
import SMTPTestModal from "./SMTPTestModal";

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
  created_at: string;
  updated_at: string;
}

interface SMTPStats {
  total_accounts: number;
  active_accounts: number;
  healthy_accounts: number;
  total_emails_today: number;
  total_successful_emails: number;
  total_failed_emails: number;
}

export default function SMTPAccountsPage() {
  const [accounts, setAccounts] = useState<SMTPAccount[]>([]);
  const [stats, setStats] = useState<SMTPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SMTPAccount | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testingAccount, setTestingAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`SMTP Accounts API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load SMTP accounts");
    },
  });

  // Load SMTP accounts
  const loadAccounts = async () => {
    if (!loading && !refreshing) setRefreshing(true);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: "20",
        search: searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      const response = await apiCallJson(
        `/api/admin/smtp-accounts?${params.toString()}`
      );

      if (response.success) {
        setAccounts(response.data.accounts);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        throw new Error(response.error || "Failed to load accounts");
      }
    } catch (error) {
      console.error("Error loading SMTP accounts:", error);
      toast.error("Failed to load SMTP accounts");
      setAccounts([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle account creation/update
  const handleAccountSave = async (accountData: any) => {
    try {
      let response;

      if (editingAccount) {
        // Update existing account
        response = await apiCallJson(
          `/api/admin/smtp-accounts/${editingAccount.id}`,
          {
            method: "PUT",
            body: JSON.stringify(accountData),
          }
        );
      } else {
        // Create new account
        response = await apiCallJson("/api/admin/smtp-accounts", {
          method: "POST",
          body: JSON.stringify(accountData),
        });
      }

      if (response.success) {
        toast.success(
          editingAccount
            ? "SMTP account updated successfully"
            : "SMTP account created successfully"
        );
        setShowAccountModal(false);
        setEditingAccount(null);
        loadAccounts();
      } else {
        throw new Error(response.error || "Failed to save account");
      }
    } catch (error) {
      console.error("Error saving SMTP account:", error);
      toast.error("Failed to save SMTP account");
    }
  };

  // Handle account deletion
  const handleAccountDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this SMTP account?")) return;

    try {
      const response = await apiCallJson(
        `/api/admin/smtp-accounts/${accountId}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        toast.success("SMTP account deleted successfully");
        loadAccounts();
      } else {
        throw new Error(response.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting SMTP account:", error);
      toast.error("Failed to delete SMTP account");
    }
  };

  // Test account connection - now opens modal
  const handleAccountTest = async (accountId: string, accountName: string) => {
    setTestingAccount({ id: accountId, name: accountName });
    setShowTestModal(true);
  };

  // Handle edit account
  const handleAccountEdit = (account: SMTPAccount) => {
    setEditingAccount(account);
    setShowAccountModal(true);
  };

  // Handle add new account
  const handleAddAccount = () => {
    setEditingAccount(null);
    setShowAccountModal(true);
  };

  useEffect(() => {
    loadAccounts();
  }, [currentPage, searchQuery, statusFilter, sortBy, sortOrder]);

  // Status filter options
  const statusOptions = [
    { value: "all", label: "All Accounts" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "healthy", label: "Healthy" },
    { value: "unhealthy", label: "Unhealthy" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMTP Accounts</h1>
          <p className="text-gray-600">
            Manage multiple SMTP accounts for load balancing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showAnalytics ? "Hide Analytics" : "Show Analytics"}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configuration
          </Button>

          <Button
            onClick={handleAddAccount}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add SMTP Account
          </Button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && <SMTPAnalyticsPanel />}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_accounts}
                </p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {stats.active_accounts} Active
              </Badge>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Healthy Accounts</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.healthy_accounts}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge
                variant={
                  stats.healthy_accounts === stats.active_accounts
                    ? "success"
                    : "warning"
                }
                className="text-xs"
              >
                {Math.round(
                  (stats.healthy_accounts / Math.max(stats.total_accounts, 1)) *
                    100
                )}
                % Healthy
              </Badge>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total_emails_today}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.total_successful_emails + stats.total_failed_emails > 0
                    ? Math.round(
                        (stats.total_successful_emails /
                          (stats.total_successful_emails +
                            stats.total_failed_emails)) *
                          100
                      )
                    : 100}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {stats.total_successful_emails} /{" "}
                {stats.total_successful_emails + stats.total_failed_emails}{" "}
                Total
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search accounts by name, host, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("_");
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="priority_asc">Priority (High to Low)</option>
              <option value="last_used_at_desc">Recently Used</option>
              <option value="total_success_count_desc">Most Successful</option>
            </select>

            <Button
              variant="outline"
              onClick={loadAccounts}
              disabled={loading || refreshing}
              className="p-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || refreshing ? "animate-spin" : ""
                }`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <SMTPAccountsList
        accounts={accounts}
        loading={loading}
        onEdit={handleAccountEdit}
        onDelete={handleAccountDelete}
        onTest={handleAccountTest}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>

          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      <SMTPAccountModal
        open={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
        onSave={handleAccountSave}
        editingAccount={editingAccount}
      />

      <SMTPConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigUpdate={loadAccounts}
      />

      <SMTPTestModal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setTestingAccount(null);
        }}
        accountId={testingAccount?.id || ""}
        accountName={testingAccount?.name || ""}
        onTestComplete={() => {
          // Refresh accounts to update health status
          loadAccounts();
        }}
      />
    </div>
  );
}

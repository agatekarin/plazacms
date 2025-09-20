/**
 * Email History Page
 * View all sent emails with filtering, search, and status tracking
 */

"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Filter,
  Mail,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface EmailNotification {
  id: string;
  type: string;
  recipient_email: string;
  subject: string;
  content: string;
  template_id?: string;
  campaign_id?: string;
  order_id?: string;
  order_item_id?: string;
  status: "sent" | "failed" | "pending";
  resend_message_id?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  template_name?: string;
  // Rotation/Provider info
  smtp_account_id?: string;
  smtp_account_name?: string;
  rotation_strategy?: string;
  attempt_count?: number;
  was_fallback?: boolean;
  response_time_ms?: number;
}

export default function EmailHistoryPage() {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7days");
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage] = useState(20);

  // Clear History Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearOptions, setClearOptions] = useState({
    olderThanDays: 30,
    status: "all",
    types: [] as string[],
    excludeImportant: true,
    confirmText: "",
    maxRecords: 1000,
  });

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      toast.error(error?.message || "Failed to load email history");
    },
  });

  // Load email history
  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      // Clear current data and add aggressive cache busting
      setEmails([]);
      setFilteredEmails([]);
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const data = await apiCallJson(
        `/api/admin/emails/notifications?_t=${timestamp}&_r=${random}&page=1&limit=100`
      );
      console.log(
        "Loaded emails:",
        data.notifications?.length || 0,
        "notifications"
      );
      setEmails(data.notifications || []);
      setFilteredEmails(data.notifications || []);
    } catch (error) {
      console.error("Error loading email history:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Force refresh when component becomes visible (browser tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Tab focused, refreshing email data...");
        loadEmails();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadEmails]);

  // Filter emails
  useEffect(() => {
    let filtered = emails;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (email) =>
          email.recipient_email
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (email.template_name &&
            email.template_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((email) => email.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((email) => email.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "24hours":
          filterDate.setHours(now.getHours() - 24);
          break;
        case "7days":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "30days":
          filterDate.setDate(now.getDate() - 30);
          break;
        case "90days":
          filterDate.setDate(now.getDate() - 90);
          break;
      }

      if (dateFilter !== "all") {
        filtered = filtered.filter(
          (email) => new Date(email.created_at) >= filterDate
        );
      }
    }

    setFilteredEmails(filtered);
    setCurrentPage(1);
  }, [emails, searchTerm, statusFilter, typeFilter, dateFilter]);

  // Pagination
  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = filteredEmails.slice(
    indexOfFirstEmail,
    indexOfLastEmail
  );
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-green-100 text-green-700",
      "bg-yellow-100 text-yellow-700",
      "bg-pink-100 text-pink-700",
      "bg-indigo-100 text-indigo-700",
    ];
    const index = type.length % colors.length;
    return colors[index];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportHistory = async () => {
    try {
      const data = await apiCallJson("/api/admin/emails/export-history");
      toast.success("Email history exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // Clear History Function
  const clearHistory = async () => {
    if (clearOptions.confirmText !== "CLEAR HISTORY") {
      toast.error("Please type 'CLEAR HISTORY' to confirm deletion");
      return;
    }

    try {
      setClearLoading(true);

      // Use authenticated fetch to Hono backend
      const result = await apiCallJson(
        "/api/admin/emails/notifications/clear",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(clearOptions),
        }
      );

      toast.success(
        `${result.message}. Cleared ${result.deletedCount} emails.`
      );
      setShowClearModal(false);
      setClearOptions({
        ...clearOptions,
        confirmText: "",
      });

      // Reload emails to reflect changes
      loadEmails();
    } catch (error: any) {
      toast.error(error.message || "Failed to clear email history");
    } finally {
      setClearLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>

          <div className="grid gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/emails">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Email Dashboard
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email History</h1>
            <p className="text-gray-600 mt-1">
              View all sent emails, delivery status, and performance
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadEmails} className="min-w-32">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={exportHistory}
              className="min-w-32"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="danger"
              onClick={() => setShowClearModal(true)}
              className="min-w-32"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {loading
                  ? "..."
                  : emails.filter((e) => e.status === "sent").length}
              </div>
              <p className="text-sm text-gray-600">Total Sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {loading
                  ? "..."
                  : emails.filter((e) => e.status === "failed").length}
              </div>
              <p className="text-sm text-gray-600">Failed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {loading
                  ? "..."
                  : emails.filter((e) => e.status === "pending").length}
              </div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? "..." : emails.length}
              </div>
              <p className="text-sm text-gray-600">Total Emails</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email, subject, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="order_confirmation">
                    Order Confirmation
                  </SelectItem>
                  <SelectItem value="review_request">Review Request</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24hours">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Email History ({filteredEmails.length} of {emails.length})
              </span>
              {filteredEmails.length > emailsPerPage && (
                <span className="text-sm text-gray-500">
                  Showing {indexOfFirstEmail + 1}-
                  {Math.min(indexOfLastEmail, filteredEmails.length)} of{" "}
                  {filteredEmails.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEmails.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No emails found
                </h3>
                <p className="text-gray-600">
                  {emails.length === 0
                    ? "No emails have been sent yet"
                    : "Try adjusting your search or filter criteria"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {email.recipient_email}
                              </div>
                              {email.order_id && (
                                <div className="text-xs text-gray-500">
                                  Order: {email.order_id}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">
                                {email.subject}
                              </div>
                              {email.template_name && (
                                <div className="text-xs text-gray-500">
                                  Template: {email.template_name}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={getTypeColor(email.type)}
                              variant="outline"
                            >
                              {email.type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">
                              {email.smtp_account_name ? (
                                <div className="flex items-center space-x-1">
                                  <span className="font-medium">
                                    {email.smtp_account_name}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    SMTP
                                  </Badge>
                                </div>
                              ) : email.rotation_strategy === "hybrid" ? (
                                <div className="flex items-center space-x-1">
                                  <span className="font-medium">
                                    API Provider
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    API
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  N/A
                                </span>
                              )}
                              {email.response_time_ms &&
                                email.response_time_ms > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {email.response_time_ms}ms
                                    {email.was_fallback && " (fallback)"}
                                  </div>
                                )}
                            </div>
                          </TableCell>

                          <TableCell>{getStatusBadge(email.status)}</TableCell>

                          <TableCell>
                            <div className="text-sm">
                              {email.sent_at
                                ? formatDate(email.sent_at)
                                : formatDate(email.created_at)}
                            </div>
                            {email.error_message && (
                              <div className="text-xs text-red-600 flex items-center mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Error
                              </div>
                            )}
                          </TableCell>

                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEmail(email)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Email Details</DialogTitle>
                                  <DialogDescription>
                                    View complete email information and content
                                  </DialogDescription>
                                </DialogHeader>

                                {selectedEmail && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <strong>Recipient:</strong>
                                        <br />
                                        {selectedEmail.recipient_email}
                                      </div>
                                      <div>
                                        <strong>Status:</strong>
                                        <br />
                                        {getStatusBadge(selectedEmail.status)}
                                      </div>
                                      <div>
                                        <strong>Type:</strong>
                                        <br />
                                        {selectedEmail.type}
                                      </div>
                                      <div>
                                        <strong>Sent:</strong>
                                        <br />
                                        {selectedEmail.sent_at
                                          ? formatDate(selectedEmail.sent_at)
                                          : "Not sent"}
                                      </div>
                                      {selectedEmail.resend_message_id && (
                                        <div className="col-span-2">
                                          <strong>Message ID:</strong>
                                          <br />
                                          <code className="text-xs bg-gray-100 px-1 rounded">
                                            {selectedEmail.resend_message_id}
                                          </code>
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t pt-4">
                                      <h4 className="font-medium mb-2">
                                        Subject:
                                      </h4>
                                      <p className="text-sm bg-gray-50 p-3 rounded">
                                        {selectedEmail.subject}
                                      </p>
                                    </div>

                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Content:
                                      </h4>
                                      <div className="text-sm bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap">
                                          {selectedEmail.content}
                                        </pre>
                                      </div>
                                    </div>

                                    {selectedEmail.error_message && (
                                      <div className="border-t pt-4">
                                        <h4 className="font-medium text-red-600 mb-2 flex items-center">
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                          Error Message:
                                        </h4>
                                        <p className="text-sm bg-red-50 text-red-700 p-3 rounded">
                                          {selectedEmail.error_message}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {indexOfFirstEmail + 1} to{" "}
                      {Math.min(indexOfLastEmail, filteredEmails.length)} of{" "}
                      {filteredEmails.length} entries
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Clear History Modal */}
        <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Clear Email History
              </DialogTitle>
              <DialogDescription>
                This action will permanently delete email notifications from the
                database.
                <strong className="text-red-600">
                  {" "}
                  This cannot be undone.
                </strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Safety Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800">
                      Important Notes:
                    </h4>
                    <ul className="text-sm text-red-700 mt-2 space-y-1">
                      <li>• Email rotation analytics will NOT be affected</li>
                      <li>• API/SMTP provider statistics remain intact</li>
                      <li>• Only user email notifications will be deleted</li>
                      <li>
                        • Associated email events (opens, clicks) will also be
                        deleted
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Filter Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Delete emails older than (days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={clearOptions.olderThanDays}
                    onChange={(e) =>
                      setClearOptions({
                        ...clearOptions,
                        olderThanDays: parseInt(e.target.value) || 30,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status Filter
                  </label>
                  <Select
                    value={clearOptions.status}
                    onValueChange={(value) =>
                      setClearOptions({ ...clearOptions, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent Only</SelectItem>
                      <SelectItem value="failed">Failed Only</SelectItem>
                      <SelectItem value="pending">Pending Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Records
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    value={clearOptions.maxRecords}
                    onChange={(e) =>
                      setClearOptions({
                        ...clearOptions,
                        maxRecords: parseInt(e.target.value) || 1000,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Safety limit (max 10,000)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="excludeImportant"
                    checked={clearOptions.excludeImportant}
                    onChange={(e) =>
                      setClearOptions({
                        ...clearOptions,
                        excludeImportant: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <label htmlFor="excludeImportant" className="text-sm">
                    Exclude important emails
                    <br />
                    <span className="text-xs text-gray-500">
                      (order confirmations, password resets, etc.)
                    </span>
                  </label>
                </div>
              </div>

              {/* Confirmation Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    CLEAR HISTORY
                  </code>{" "}
                  to confirm:
                </label>
                <Input
                  value={clearOptions.confirmText}
                  onChange={(e) =>
                    setClearOptions({
                      ...clearOptions,
                      confirmText: e.target.value,
                    })
                  }
                  placeholder="Type CLEAR HISTORY to confirm"
                  className={
                    clearOptions.confirmText === "CLEAR HISTORY"
                      ? "border-green-500"
                      : clearOptions.confirmText.length > 0
                      ? "border-red-500"
                      : ""
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClearModal(false);
                    setClearOptions({ ...clearOptions, confirmText: "" });
                  }}
                  disabled={clearLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={clearHistory}
                  disabled={
                    clearOptions.confirmText !== "CLEAR HISTORY" || clearLoading
                  }
                >
                  {clearLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear History
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}

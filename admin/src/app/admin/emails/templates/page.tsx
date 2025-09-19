/**
 * Email Templates Manager
 * Create, edit, and manage email templates
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Plus,
  Edit3,
  Eye,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Send,
  Copy,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  html_content?: string;
  type: string;
  category: string;
  from_name?: string;
  from_email?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<EmailTemplate | null>(null);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      toast.error(error?.message || "Failed to load email templates");
    },
  });

  // Load email templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson("/api/admin/emails/templates");
      setTemplates(data.templates || []);
      setFilteredTemplates(data.templates || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter templates
  useEffect(() => {
    let filtered = templates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (template) => template.category === categoryFilter
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((template) => template.type === typeFilter);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, categoryFilter, typeFilter]);

  // Delete template
  const handleDeleteTemplate = async (template: EmailTemplate) => {
    try {
      await apiCallJson(`/api/admin/emails/templates/${template.id}`, {
        method: "DELETE",
      });

      toast.success("Template deleted successfully");
      loadTemplates(); // Reload templates
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  // Send test email
  const handleTestTemplate = async (template: EmailTemplate) => {
    try {
      await apiCallJson("/api/admin/emails/test", {
        method: "POST",
        body: JSON.stringify({
          template_id: template.id,
        }),
      });

      toast.success(
        `Test email sent using "${template.name}" template with its own settings`
      );
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email");
    }
  };

  // Toggle template active status
  const toggleTemplateStatus = async (template: EmailTemplate) => {
    try {
      await apiCallJson(`/api/admin/emails/templates/${template.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...template,
          is_active: !template.is_active,
        }),
      });

      toast.success(
        `Template ${!template.is_active ? "activated" : "deactivated"}`
      );
      loadTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "transactional":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "marketing":
        return "bg-green-100 text-green-700 border-green-200";
      case "system":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "custom":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    const colors = [
      "bg-red-100 text-red-700",
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-yellow-100 text-yellow-700",
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
    ];
    const index = type.length % colors.length;
    return colors[index];
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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Email Templates
            </h1>
            <p className="text-gray-600 mt-1">
              Manage email templates for transactional and marketing emails
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild>
              <Link href="/admin/emails/templates/create">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates by name, subject, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
                  <SelectItem value="password_reset">Password Reset</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No email templates found
              </h3>
              <p className="text-gray-600 mb-6">
                {templates.length === 0
                  ? "Get started by creating your first email template"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {templates.length === 0 && (
                <Button asChild>
                  <Link href="/admin/emails/templates/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Template Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {template.name}
                        </h3>

                        {/* Status Indicators */}
                        <div className="flex items-center gap-2">
                          {template.is_active ? (
                            <CheckCircle
                              className="h-4 w-4 text-green-500"
                              aria-label="Active"
                            />
                          ) : (
                            <AlertTriangle
                              className="h-4 w-4 text-yellow-500"
                              aria-label="Inactive"
                            />
                          )}

                          {template.is_default && (
                            <Badge variant="outline" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 font-medium">
                        Subject:{" "}
                        <span className="font-normal">{template.subject}</span>
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getTypeColor(template.type)}
                        >
                          {template.type}
                        </Badge>

                        {template.from_name && (
                          <Badge variant="outline" className="text-xs">
                            From: {template.from_name}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-500">
                        Created:{" "}
                        {new Date(template.created_at).toLocaleDateString()}
                        {template.updated_at !== template.created_at && (
                          <span>
                            {" "}
                            • Updated:{" "}
                            {new Date(template.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestTemplate(template)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-2">
                          Test
                        </span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-green-600 hover:text-green-700"
                      >
                        <Link
                          href={`/admin/emails/templates/${template.id}/preview`}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-2">
                            Preview
                          </span>
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Link
                          href={`/admin/emails/templates/${template.id}/edit`}
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-2">
                            Edit
                          </span>
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTemplateStatus(template)}
                        className={
                          template.is_active
                            ? "text-yellow-600 hover:text-yellow-700"
                            : "text-green-600 hover:text-green-700"
                        }
                      >
                        {template.is_active ? (
                          <>
                            <AlertTriangle className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-2">
                              Deactivate
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-2">
                              Activate
                            </span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-2">
                          Delete
                        </span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{templateToDelete?.name}"? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  templateToDelete && handleDeleteTemplate(templateToDelete)
                }
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageContainer>
  );
}

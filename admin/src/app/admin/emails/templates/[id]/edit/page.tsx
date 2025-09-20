/**
 * Edit Email Template Page
 * Form to edit existing email templates
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Eye,
  Mail,
  Code,
  Settings,
  AlertCircle,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface TemplateFormData {
  id?: string;
  name: string;
  subject: string;
  content: string;
  html_content: string;
  type: string;
  category: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  is_active: boolean;
  is_default: boolean;
  preview_text: string;
  tags: string[];
}

const templateTypes = [
  "welcome",
  "order_confirmation",
  "order_shipped",
  "order_delivered",
  "review_request",
  "review_reminder",
  "review_approved",
  "review_rejected",
  "newsletter",
  "promotional",
  "password_reset",
  "account_verification",
  "custom",
];

const templateCategories = [
  "transactional",
  "marketing",
  "system",
  "notifications",
  "custom",
];

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [originalData, setOriginalData] = useState<TemplateFormData | null>(
    null
  );

  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    subject: "",
    content: "",
    html_content: "",
    type: "custom",
    category: "transactional",
    from_name: "PlazaCMS",
    from_email: "noreply@plazaku.my.id",
    reply_to: "",
    is_active: true,
    is_default: false,
    preview_text: "",
    tags: [],
  });

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      toast.error(error?.message || "Request failed");
      setSaving(false);
      setDeleting(false);
    },
  });

  // Load template data
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;

      try {
        setLoading(true);
        const data = await apiCallJson(
          `/api/admin/emails/templates/${templateId}`
        );

        if (data.template) {
          const template = data.template;
          const templateData: TemplateFormData = {
            id: template.id,
            name: template.name || "",
            subject: template.subject || "",
            content: template.content || "",
            html_content: template.html_content || "",
            type: template.type || "custom",
            category: template.category || "transactional",
            from_name: template.from_name || "PlazaCMS",
            from_email: template.from_email || "noreply@plazaku.my.id",
            reply_to: template.reply_to || "",
            is_active: template.is_active !== false,
            is_default: template.is_default === true,
            preview_text: template.preview_text || "",
            tags: template.tags || [],
          };

          setFormData(templateData);
          setOriginalData(templateData);
        } else {
          toast.error("Template not found");
          router.push("/admin/emails/templates");
        }
      } catch (error) {
        console.error("Error loading template:", error);
        toast.error("Failed to load template");
        router.push("/admin/emails/templates");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, apiCallJson, router]);

  const handleInputChange = (field: keyof TemplateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.subject || !formData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);

    try {
      const result = await apiCallJson(
        `/api/admin/emails/templates/${templateId}`,
        {
          method: "PUT",
          body: JSON.stringify(formData),
        }
      );

      toast.success("Template updated successfully!");
      setOriginalData(formData);
    } catch (error) {
      console.error("Error updating template:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;

    setDeleting(true);

    try {
      await apiCallJson(`/api/admin/emails/templates/${templateId}`, {
        method: "DELETE",
      });

      toast.success("Template deleted successfully!");
      router.push("/admin/emails/templates");
    } catch (error) {
      console.error("Error deleting template:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const hasChanges = () => {
    if (!originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const processedContent = formData.content
    .replace(/\{\{customer_name\}\}/g, "John Doe")
    .replace(/\{\{store_name\}\}/g, "PlazaCMS Demo")
    .replace(/\{\{order_number\}\}/g, "ORD-12345")
    .replace(/\{\{product_name\}\}/g, "Sample Product")
    .replace(/\{\{order_total\}\}/g, "$99.99");

  const processedHtmlContent = formData.html_content
    ? formData.html_content
        .replace(/\{\{customer_name\}\}/g, "John Doe")
        .replace(/\{\{store_name\}\}/g, "PlazaCMS Demo")
        .replace(/\{\{order_number\}\}/g, "ORD-12345")
        .replace(/\{\{product_name\}\}/g, "Sample Product")
        .replace(/\{\{order_total\}\}/g, "$99.99")
    : processedContent.replace(/\n/g, "<br>");

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading template...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/emails/templates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Email Template
            </h1>
            <p className="text-gray-600 mt-1">
              Modify your email template settings and content
            </p>
            {hasChanges() && (
              <p className="text-yellow-600 text-sm mt-1">
                • You have unsaved changes
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{formData.name}"? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Template"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              onClick={handlePreview}
              className="min-w-32"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Edit Mode" : "Preview"}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="min-w-32 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Panel */}
          <div className="lg:col-span-2">
            {!previewMode ? (
              <form onSubmit={handleSave} className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Essential template details and categorization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Template Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Welcome Email"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type">Template Type *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) =>
                            handleInputChange("type", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templateTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            handleInputChange("category", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templateCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.replace(/\b\w/g, (l) =>
                                  l.toUpperCase()
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preview_text">Preview Text</Label>
                        <Input
                          id="preview_text"
                          placeholder="Short preview for email clients"
                          value={formData.preview_text}
                          onChange={(e) =>
                            handleInputChange("preview_text", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Email Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="e.g., Welcome to {{store_name}}!"
                        value={formData.subject}
                        onChange={(e) =>
                          handleInputChange("subject", e.target.value)
                        }
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email Content */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Email Content
                    </CardTitle>
                    <CardDescription>
                      Design your email template with text and HTML content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="text" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text">Plain Text</TabsTrigger>
                        <TabsTrigger value="html">HTML</TabsTrigger>
                      </TabsList>

                      <TabsContent value="text" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="content">Text Content *</Label>
                          <Textarea
                            id="content"
                            placeholder="Enter your email content here..."
                            rows={12}
                            value={formData.content}
                            onChange={(e) =>
                              handleInputChange("content", e.target.value)
                            }
                            required
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="html" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="html_content">HTML Content</Label>
                          <Textarea
                            id="html_content"
                            placeholder="Enter your HTML content here..."
                            rows={12}
                            value={formData.html_content}
                            onChange={(e) =>
                              handleInputChange("html_content", e.target.value)
                            }
                          />
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Variable Helper */}
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">
                            Available Variables
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            You can use these variables in your content:
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {[
                              "customer_name",
                              "store_name",
                              "order_number",
                              "product_name",
                              "order_total",
                              "tracking_url",
                              "unsubscribe_url",
                            ].map((variable) => (
                              <Badge
                                key={variable}
                                variant="outline"
                                className="text-xs bg-blue-100 text-blue-700 border-blue-300"
                              >
                                {"{{"}
                                {variable}
                                {"}}"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Email Settings
                    </CardTitle>
                    <CardDescription>
                      Configure sender information and template options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="from_name">From Name</Label>
                        <Input
                          id="from_name"
                          placeholder="PlazaCMS"
                          value={formData.from_name}
                          onChange={(e) =>
                            handleInputChange("from_name", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="from_email">From Email</Label>
                        <Input
                          id="from_email"
                          type="email"
                          placeholder="noreply@plazaku.my.id"
                          value={formData.from_email}
                          onChange={(e) =>
                            handleInputChange("from_email", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reply_to">Reply-To Email</Label>
                      <Input
                        id="reply_to"
                        type="email"
                        placeholder="support@plazacms.com (optional)"
                        value={formData.reply_to}
                        onChange={(e) =>
                          handleInputChange("reply_to", e.target.value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_active">Active Template</Label>
                        <p className="text-sm text-gray-600">
                          Enable this template for use in campaigns
                        </p>
                      </div>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          handleInputChange("is_active", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_default">Default Template</Label>
                        <p className="text-sm text-gray-600">
                          Use as default template for this type
                        </p>
                      </div>
                      <Switch
                        id="is_default"
                        checked={formData.is_default}
                        onCheckedChange={(checked) =>
                          handleInputChange("is_default", checked)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            ) : (
              /* Preview Panel */
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Email Preview
                  </CardTitle>
                  <CardDescription>
                    Preview how your email will look with sample data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-white">
                    <div className="border-b pb-4 mb-4">
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>From:</strong> {formData.from_name} &lt;
                        {formData.from_email}&gt;
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Subject:</strong>{" "}
                        {formData.subject
                          .replace(/\{\{customer_name\}\}/g, "John Doe")
                          .replace(/\{\{store_name\}\}/g, "PlazaCMS Demo")}
                      </div>
                      {formData.preview_text && (
                        <div className="text-sm text-gray-500 italic">
                          {formData.preview_text}
                        </div>
                      )}
                    </div>

                    <div className="prose max-w-none">
                      {formData.html_content ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: processedHtmlContent,
                          }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {processedContent}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ID:</span>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    {templateId}
                  </code>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <Badge variant="outline">
                    {formData.type.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Category:</span>
                  <Badge
                    className={
                      formData.category === "transactional"
                        ? "bg-blue-100 text-blue-700"
                        : formData.category === "marketing"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {formData.category}
                  </Badge>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={formData.is_active ? "default" : "secondary"}>
                    {formData.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {formData.is_default && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Default:</span>
                    <Badge className="bg-yellow-100 text-yellow-700">
                      Default
                    </Badge>
                  </div>
                )}

                {hasChanges() && (
                  <div className="pt-2 border-t">
                    <Badge className="bg-yellow-100 text-yellow-700">
                      Unsaved Changes
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? "Edit Mode" : "Preview"}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || !hasChanges()}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href={`/admin/emails/templates/${templateId}/preview`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Preview
                  </Link>
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin/emails/templates">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Templates
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>• Changes are automatically tracked</p>
                <p>• Use preview to see how your email looks</p>
                <p>• HTML content overrides plain text</p>
                <p>• Be careful with default template settings</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

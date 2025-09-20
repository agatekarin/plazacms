/**
 * Preview Email Template Page
 * Live preview of email templates with sample data
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit3,
  Send,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Code,
  Loader2,
  Download,
  Share,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import Link from "next/link";

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
  reply_to?: string;
  is_active: boolean;
  is_default: boolean;
  preview_text?: string;
  created_at: string;
  updated_at: string;
}

const sampleVariables = {
  customer_name: "John Doe",
  store_name: "PlazaCMS Demo",
  order_number: "ORD-12345",
  product_name: "Premium Widget",
  order_total: "$149.99",
  tracking_url: "https://track.example.com/12345",
  unsubscribe_url: "https://plazacms.com/unsubscribe",
  review_link: "https://plazacms.com/review/12345",
  customer_email: "john.doe@example.com",
  store_url: "https://plazacms.com",
};

export default function PreviewTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile" | "tablet">(
    "desktop"
  );
  const [contentMode, setContentMode] = useState<"rendered" | "source">(
    "rendered"
  );

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url: string, error: any) => {
      toast.error(error?.message || "Failed to load template");
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
          setTemplate(data.template);
        } else {
          toast.error("Template not found");
          router.push("/admin/emails/templates");
        }
      } catch (error) {
        console.error("Error loading template:", error);
        router.push("/admin/emails/templates");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, apiCallJson, router]);

  const replaceVariables = (content: string): string => {
    let processedContent = content;

    Object.entries(sampleVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
  };

  const sendTestEmail = async () => {
    if (!template) return;

    try {
      await apiCallJson("/api/admin/emails/test", {
        method: "POST",
        body: JSON.stringify({
          template_id: template.id,
          email: "agatekarin@gmail.com", // In real app, would prompt for email
        }),
      });

      toast.success("Test email sent!");
    } catch (error) {
      console.error("Error sending test email:", error);
    }
  };

  const getViewportClass = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-sm mx-auto";
      case "tablet":
        return "max-w-2xl mx-auto";
      default:
        return "max-w-4xl mx-auto";
    }
  };

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

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading template preview...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!template) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-gray-600">Template not found</p>
          <Button asChild className="mt-4">
            <Link href="/admin/emails/templates">Back to Templates</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const processedSubject = replaceVariables(template.subject);
  const processedContent = replaceVariables(template.content);
  const processedHtmlContent = template.html_content
    ? replaceVariables(template.html_content)
    : processedContent.replace(/\n/g, "<br>");

  return (
    <PageContainer>
      <div className="space-y-6">
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
              {template.name} Preview
            </h1>
            <p className="text-gray-600 mt-1">
              Live preview of your email template with sample data
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={sendTestEmail}
              className="text-blue-600"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/emails/templates/${templateId}/edit`}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Template
              </Link>
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Viewport Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">View:</span>
            <Button
              variant={viewMode === "desktop" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
            <Button
              variant={viewMode === "tablet" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tablet")}
            >
              <Tablet className="h-4 w-4 mr-1" />
              Tablet
            </Button>
            <Button
              variant={viewMode === "mobile" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mobile")}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
          </div>

          {/* Content Mode Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Mode:</span>
            <Button
              variant={contentMode === "rendered" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setContentMode("rendered")}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              variant={contentMode === "source" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setContentMode("source")}
            >
              <Code className="h-4 w-4 mr-1" />
              Source
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Preview Area */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Email Preview
                </CardTitle>
                <CardDescription>
                  Preview how your email will appear to recipients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentMode === "rendered" ? (
                  <div className={`${getViewportClass()} transition-all`}>
                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                      {/* Email Header */}
                      <div className="bg-gray-50 border-b px-6 py-4">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <strong>From:</strong>{" "}
                            {template.from_name || "PlazaCMS"} &lt;
                            {template.from_email || "noreply@plazaku.my.id"}&gt;
                          </div>
                          <div>
                            <strong>To:</strong> john.doe@example.com
                          </div>
                          <div>
                            <strong>Subject:</strong> {processedSubject}
                          </div>
                          {template.preview_text && (
                            <div className="text-gray-500 italic">
                              {template.preview_text}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="p-6">
                        {template.html_content ? (
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: processedHtmlContent,
                            }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                            {processedContent}
                          </div>
                        )}
                      </div>

                      {/* Email Footer */}
                      <div className="bg-gray-50 border-t px-6 py-3">
                        <div className="text-xs text-gray-500 text-center">
                          Sent with PlazaCMS • {sampleVariables.store_name}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Tabs defaultValue="html" className="w-full">
                    <TabsList>
                      <TabsTrigger value="html">HTML Source</TabsTrigger>
                      <TabsTrigger value="text">Text Source</TabsTrigger>
                      <TabsTrigger value="processed">Processed</TabsTrigger>
                    </TabsList>

                    <TabsContent value="html" className="mt-4">
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                        <code>
                          {template.html_content ||
                            "<!-- No HTML content -->\n" +
                              processedContent.replace(/\n/g, "<br>\n")}
                        </code>
                      </pre>
                    </TabsContent>

                    <TabsContent value="text" className="mt-4">
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                        <code>{template.content}</code>
                      </pre>
                    </TabsContent>

                    <TabsContent value="processed" className="mt-4">
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
                        <code>
                          {template.html_content
                            ? processedHtmlContent
                            : processedContent}
                        </code>
                      </pre>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{template.name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Type:</span>
                  <Badge variant="outline">
                    {template.type.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Category:</span>
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={template.is_active ? "default" : "secondary"}>
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {template.is_default && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Default:</span>
                    <Badge className="bg-yellow-100 text-yellow-700">
                      Default
                    </Badge>
                  </div>
                )}

                <div className="pt-2 border-t space-y-2">
                  <div className="text-xs text-gray-500">
                    Created:{" "}
                    {new Date(template.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated:{" "}
                    {new Date(template.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample Data */}
            <Card>
              <CardHeader>
                <CardTitle>Sample Data</CardTitle>
                <CardDescription>
                  Variables used in this preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(sampleVariables).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      {"{{"}
                      {key}
                      {"}}"}
                    </code>
                    <span className="text-gray-600 truncate ml-2">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={sendTestEmail}
                  variant="outline"
                  className="w-full text-blue-600"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href={`/admin/emails/templates/${templateId}/edit`}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Template
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
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import toast from "react-hot-toast";
import {
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Users,
  Star,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type:
    | "review_request"
    | "review_reminder"
    | "review_approved"
    | "review_rejected";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailNotificationProps {
  orderId?: string;
  orderItemId?: string;
  customerEmail?: string;
  productName?: string;
  onSent?: () => void;
}

export function ReviewEmailNotification({
  orderId,
  orderItemId,
  customerEmail,
  productName,
  onSent,
}: EmailNotificationProps) {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      toast.error(error?.message || "Email notification failed");
    },
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customContent, setCustomContent] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Fetch email templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const data = await apiCallJson("/api/admin/reviews/email-templates");
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error fetching email templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [apiCallJson]);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setCustomSubject(template.subject);
      setCustomContent(template.content);
    }
  };

  // Send email notification
  const sendEmailNotification = useCallback(async () => {
    if (!selectedTemplate && (!customSubject || !customContent)) {
      toast.error("Please select a template or provide custom content");
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        template_id: selectedTemplate || null,
        custom_subject: customSubject,
        custom_content: customContent,
        order_id: orderId,
        order_item_id: orderItemId,
        customer_email: customerEmail,
        product_name: productName,
      };

      await apiCallJson("/api/admin/reviews/send-email", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Email notification sent successfully");
      onSent?.();
    } catch (error) {
      console.error("Error sending email notification:", error);
    } finally {
      setIsSending(false);
    }
  }, [
    selectedTemplate,
    customSubject,
    customContent,
    orderId,
    orderItemId,
    customerEmail,
    productName,
    apiCallJson,
    onSent,
  ]);

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case "review_request":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "review_reminder":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "review_approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "review_rejected":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case "review_request":
        return "Review Request";
      case "review_reminder":
        return "Review Reminder";
      case "review_approved":
        return "Review Approved";
      case "review_rejected":
        return "Review Rejected";
      default:
        return "Unknown";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Email Notification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customerEmail && productName && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Sending to: <strong>{customerEmail}</strong> for product:{" "}
              <strong>{productName}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Email Template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template or use custom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Email</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    {getTemplateTypeIcon(template.type)}
                    <span>{template.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getTemplateTypeLabel(template.type)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <input
            id="email-subject"
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="Email subject..."
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-content">Content</Label>
          <Textarea
            id="email-content"
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder="Email content... You can use variables like {{customer_name}}, {{product_name}}, {{review_link}}"
            rows={8}
          />
          <p className="text-xs text-gray-500">
            Available variables:{" "}
            {`{{customer_name}}, {{product_name}}, {{order_number}}, {{review_link}}, {{store_name}}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={sendEmailNotification}
            disabled={
              isSending ||
              (!selectedTemplate && (!customSubject || !customContent))
            }
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </div>

        {selectedTemplate && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Template Preview</span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-1">Subject: {customSubject}</div>
              <div className="whitespace-pre-wrap">{customContent}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

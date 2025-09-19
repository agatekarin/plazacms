/**
 * Send Email Page
 * Send custom emails or test templates
 */

"use client";

import { useState } from "react";
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
import { Send, Mail, Zap, ArrowLeft } from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function SendEmailPage() {
  const [sending, setSending] = useState(false);

  // Custom Email Form
  const [customEmail, setCustomEmail] = useState({
    to: "",
    subject: "",
    content: "",
    html_content: "",
  });

  // Template Email Form
  const [templateEmail, setTemplateEmail] = useState({
    email: "",
    template_type: "welcome",
  });

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      toast.error(error?.message || "Failed to send email");
      setSending(false);
    },
  });

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customEmail.to || !customEmail.subject || !customEmail.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);

    try {
      const result = await apiCallJson("/api/admin/emails/send", {
        method: "POST",
        body: JSON.stringify(customEmail),
      });

      toast.success("Email sent successfully!");

      // Reset form
      setCustomEmail({
        to: "",
        subject: "",
        content: "",
        html_content: "",
      });
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setSending(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateEmail.email) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);

    try {
      const result = await apiCallJson("/api/admin/emails/test", {
        method: "POST",
        body: JSON.stringify(templateEmail),
      });

      toast.success(`Test email sent to ${templateEmail.email}!`);
    } catch (error) {
      console.error("Error sending test email:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/emails">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Email Dashboard
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Email</h1>
          <p className="text-gray-600 mt-1">
            Send custom emails or test email templates
          </p>
        </div>

        <Tabs defaultValue="custom" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Custom Email
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Test Template
            </TabsTrigger>
          </TabsList>

          {/* Custom Email Tab */}
          <TabsContent value="custom">
            <Card>
              <CardHeader>
                <CardTitle>Send Custom Email</CardTitle>
                <CardDescription>
                  Compose and send a custom email message
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendCustomEmail} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {/* To Email */}
                    <div className="space-y-2">
                      <Label htmlFor="to">To Email *</Label>
                      <Input
                        id="to"
                        type="email"
                        placeholder="recipient@example.com"
                        value={customEmail.to}
                        onChange={(e) =>
                          setCustomEmail({ ...customEmail, to: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Enter email subject..."
                        value={customEmail.subject}
                        onChange={(e) =>
                          setCustomEmail({
                            ...customEmail,
                            subject: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <Label htmlFor="content">Message Content *</Label>
                      <Textarea
                        id="content"
                        placeholder="Enter your message content..."
                        rows={8}
                        value={customEmail.content}
                        onChange={(e) =>
                          setCustomEmail({
                            ...customEmail,
                            content: e.target.value,
                          })
                        }
                        required
                      />
                      <p className="text-xs text-gray-500">
                        You can use variables like: {"{{"} customer_name {"}}"},{" "}
                        {"{{"} store_name {"}}"}, {"{{"} order_number {"}}"}
                      </p>
                    </div>

                    {/* HTML Content (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="html_content">
                        HTML Content (Optional)
                      </Label>
                      <Textarea
                        id="html_content"
                        placeholder="<html><body><h1>Your HTML content here...</h1></body></html>"
                        rows={6}
                        value={customEmail.html_content}
                        onChange={(e) =>
                          setCustomEmail({
                            ...customEmail,
                            html_content: e.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-gray-500">
                        If provided, this HTML will be used instead of plain
                        text
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={sending}
                      className="min-w-32"
                    >
                      {sending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Template Tab */}
          <TabsContent value="template">
            <Card>
              <CardHeader>
                <CardTitle>Test Email Template</CardTitle>
                <CardDescription>
                  Send a test email using an existing template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendTestEmail} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="test-email">Test Email Address *</Label>
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="your-email@example.com"
                        value={templateEmail.email}
                        onChange={(e) =>
                          setTemplateEmail({
                            ...templateEmail,
                            email: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    {/* Template Type */}
                    <div className="space-y-2">
                      <Label htmlFor="template-type">Template Type *</Label>
                      <Select
                        value={templateEmail.template_type}
                        onValueChange={(value) =>
                          setTemplateEmail({
                            ...templateEmail,
                            template_type: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="welcome">Welcome Email</SelectItem>
                          <SelectItem value="order_confirmation">
                            Order Confirmation
                          </SelectItem>
                          <SelectItem value="review_request">
                            Review Request
                          </SelectItem>
                          <SelectItem value="review_reminder">
                            Review Reminder
                          </SelectItem>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="password_reset">
                            Password Reset
                          </SelectItem>
                          <SelectItem value="custom">
                            Custom Template
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-2">
                      Template Preview:
                    </h4>
                    <p className="text-sm text-gray-600">
                      This will send a test email using the "
                      {templateEmail.template_type}" template with sample data:
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      <li>• Customer Name: "Test User"</li>
                      <li>• Store Name: "PlazaCMS Demo"</li>
                      <li>• Order Number: "TEST-001"</li>
                      <li>• Product Name: "Test Product"</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={sending}
                      className="min-w-32"
                    >
                      {sending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common email management tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/admin/emails/templates">
                <Mail className="h-4 w-4 mr-2" />
                Manage Templates
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/admin/emails/analytics">
                <Send className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/admin/emails/history">
                <Mail className="h-4 w-4 mr-2" />
                Email History
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

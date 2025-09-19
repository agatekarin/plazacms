"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EnvelopeIcon,
  ServerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface EmailSettings {
  id?: string;
  from_name: string;
  from_email: string;
  reply_to?: string;
  resend_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_encryption?: string;
  provider: "resend" | "smtp";
  is_active: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  webhook_events?: string[];
}

interface EmailSettingsManagerProps {
  initialSettings: EmailSettings | null;
}

export default function EmailSettingsManager({
  initialSettings,
}: EmailSettingsManagerProps) {
  const [settings, setSettings] = useState<EmailSettings>(
    initialSettings || {
      from_name: "PlazaCMS Demo",
      from_email: "onboarding@resend.dev",
      reply_to: "",
      resend_api_key: "",
      smtp_host: "",
      smtp_port: 587,
      smtp_username: "",
      smtp_password: "",
      smtp_encryption: "tls",
      provider: "resend",
      is_active: true,
      webhook_url: "",
      webhook_secret: "",
      webhook_events: [
        "email.sent",
        "email.delivered",
        "email.opened",
        "email.clicked",
        "email.bounced",
      ],
    }
  );

  const [isPending, startTransition] = useTransition();
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error("API Error:", error);
    },
  });

  const updateField = <K extends keyof EmailSettings>(
    field: K,
    value: EmailSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const generateWebhookUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port =
      window.location.hostname === "localhost" ? "1945" : window.location.port;
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    return `${baseUrl}/api/admin/emails/webhook/resend`;
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await apiCallJson("/api/admin/settings/email", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        toast.success("Email settings saved successfully!");
        router.refresh();
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save email settings"
        );
      }
    });
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    setTesting(true);
    try {
      const result = await apiCallJson("/api/admin/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: testEmail }),
      });

      toast.success(`Test email configuration validated!`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to test email settings"
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced & SMTP</TabsTrigger>
        </TabsList>

        {/* Basic Settings Tab */}
        <TabsContent value="basic" className="space-y-6">
          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                Email Provider
              </CardTitle>
              <CardDescription>
                Choose your email delivery service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="provider">Email Provider</Label>
                <Select
                  value={settings.provider}
                  onValueChange={(value: "resend" | "smtp") =>
                    updateField("provider", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend (Recommended)</SelectItem>
                    <SelectItem value="smtp">Custom SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={settings.is_active}
                  onCheckedChange={(checked) =>
                    updateField("is_active", checked)
                  }
                />
                <Label htmlFor="is_active">Enable email delivery</Label>
              </div>
            </CardContent>
          </Card>

          {/* From Settings */}
          <Card>
            <CardHeader>
              <CardTitle>From Information</CardTitle>
              <CardDescription>
                Configure sender information for outgoing emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="from_name">From Name</Label>
                <Input
                  id="from_name"
                  value={settings.from_name}
                  onChange={(e) => updateField("from_name", e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <Label htmlFor="from_email">From Email</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => updateField("from_email", e.target.value)}
                  placeholder="noreply@yourdomain.com"
                />
                {settings.provider === "resend" && (
                  <p className="text-sm text-amber-600 mt-1">
                    💡 For development, use: onboarding@resend.dev (no
                    verification required)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="reply_to">Reply To (Optional)</Label>
                <Input
                  id="reply_to"
                  type="email"
                  value={settings.reply_to || ""}
                  onChange={(e) => updateField("reply_to", e.target.value)}
                  placeholder="support@yourdomain.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Resend Settings */}
          {settings.provider === "resend" && (
            <Card>
              <CardHeader>
                <CardTitle>Resend Configuration</CardTitle>
                <CardDescription>Configure Resend API settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="resend_api_key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="resend_api_key"
                      type={showApiKey ? "text" : "password"}
                      value={settings.resend_api_key || ""}
                      onChange={(e) =>
                        updateField("resend_api_key", e.target.value)
                      }
                      placeholder="re_xxxxxxxxxxxxx"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Get your API key from{" "}
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Resend Dashboard
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Advanced & SMTP Tab */}
        <TabsContent value="advanced" className="space-y-6">
          {/* SMTP Settings */}
          {settings.provider === "smtp" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ServerIcon className="h-5 w-5 text-green-500" />
                  SMTP Configuration
                </CardTitle>
                <CardDescription>
                  Configure custom SMTP server settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={settings.smtp_host || ""}
                    onChange={(e) => updateField("smtp_host", e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={settings.smtp_port || 587}
                      onChange={(e) =>
                        updateField("smtp_port", parseInt(e.target.value))
                      }
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <Label htmlFor="smtp_encryption">Encryption</Label>
                    <Select
                      value={settings.smtp_encryption || "tls"}
                      onValueChange={(value) =>
                        updateField("smtp_encryption", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="smtp_username">SMTP Username</Label>
                  <Input
                    id="smtp_username"
                    value={settings.smtp_username || ""}
                    onChange={(e) =>
                      updateField("smtp_username", e.target.value)
                    }
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="smtp_password">SMTP Password</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showPassword ? "text" : "password"}
                      value={settings.smtp_password || ""}
                      onChange={(e) =>
                        updateField("smtp_password", e.target.value)
                      }
                      placeholder="••••••••••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ServerIcon className="h-5 w-5 text-purple-500" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure webhooks to track email events (opens, clicks,
                bounces)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook_url"
                    value={settings.webhook_url || ""}
                    onChange={(e) => updateField("webhook_url", e.target.value)}
                    placeholder="https://yourdomain.com/api/admin/emails/webhook/resend"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateField("webhook_url", generateWebhookUrl())
                    }
                    className="px-3"
                  >
                    Auto-fill
                  </Button>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  💡 Development: Use ngrok tunnel for local testing, or click
                  Auto-fill for current domain
                </p>
              </div>

              <div>
                <Label htmlFor="webhook_secret">
                  Webhook Secret (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="webhook_secret"
                    type={showPassword ? "text" : "password"}
                    value={settings.webhook_secret || ""}
                    onChange={(e) =>
                      updateField("webhook_secret", e.target.value)
                    }
                    placeholder="webhook_secret_key"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Webhook Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { value: "email.sent", label: "Email Sent" },
                    { value: "email.delivered", label: "Delivered" },
                    { value: "email.opened", label: "Opened" },
                    { value: "email.clicked", label: "Clicked" },
                    { value: "email.bounced", label: "Bounced" },
                    { value: "email.complained", label: "Complained" },
                  ].map((event) => (
                    <div
                      key={event.value}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={event.value}
                        checked={(settings.webhook_events || []).includes(
                          event.value
                        )}
                        onChange={(e) => {
                          const currentEvents = settings.webhook_events || [];
                          const newEvents = e.target.checked
                            ? [...currentEvents, event.value]
                            : currentEvents.filter((ev) => ev !== event.value);
                          updateField("webhook_events", newEvents);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor={event.value} className="text-sm">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Select events to track for email analytics (opens, clicks,
                  etc.)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                Test Configuration
              </CardTitle>
              <CardDescription>
                Test your email settings to ensure they work correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test_email">Test Email Address</Label>
                <Input
                  id="test_email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>

              <Button
                onClick={handleTest}
                disabled={testing || !testEmail}
                variant="outline"
                className="w-full"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    Testing Configuration...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Test Email Configuration
                  </>
                )}
              </Button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-amber-800 font-medium">Test Mode</p>
                    <p className="text-amber-700 mt-1">
                      This will validate your configuration but won't actually
                      send an email yet.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            "Save Email Settings"
          )}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, TestTube } from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface SMTPTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  onTestComplete: () => void;
}

export default function SMTPTestModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  onTestComplete,
}: SMTPTestModalProps) {
  const [testEmail, setTestEmail] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { apiCallJson } = useAuthenticatedFetch();

  // Load default test email when modal opens
  useEffect(() => {
    if (isOpen && !testEmail) {
      loadDefaultTestEmail();
    }
  }, [isOpen]);

  const loadDefaultTestEmail = async () => {
    try {
      const response = await apiCallJson(
        "/api/admin/email-settings/test-email"
      );
      if (response.success && response.data?.default_test_email) {
        setTestEmail(response.data.default_test_email);
      }
    } catch (error) {
      console.log("No default test email found");
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter a test email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Save as default if requested
      if (saveAsDefault) {
        await apiCallJson("/api/admin/email-settings/test-email", {
          method: "POST",
          body: JSON.stringify({ default_test_email: testEmail }),
        });
      }

      // Perform SMTP test
      const response = await apiCallJson(
        `/api/admin/smtp-accounts/${accountId}/test`,
        {
          method: "POST",
          body: JSON.stringify({ email: testEmail }),
        }
      );

      if (response.success && response.data.success) {
        toast.success(
          `✅ Test successful! Email sent to ${testEmail}. Response time: ${response.data.response_time_ms}ms`
        );
        onTestComplete();
        onClose();
      } else {
        toast.error(
          `❌ Test failed: ${response.data?.message || "Connection error"}`
        );
      }
    } catch (error) {
      console.error("Error testing SMTP account:", error);
      toast.error("Failed to test SMTP account connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setTestEmail("");
      setSaveAsDefault(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-600" />
            Test SMTP Connection
          </DialogTitle>
          <DialogDescription>
            Send a test email using <strong>{accountName}</strong> to verify the
            SMTP configuration is working correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Test Email Address
            </Label>
            <Input
              id="test-email"
              type="email"
              placeholder="your-email@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              A test email will be sent to this address to verify SMTP
              connectivity.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-default"
              checked={saveAsDefault}
              onCheckedChange={(checked: boolean) => setSaveAsDefault(checked)}
              disabled={isLoading}
            />
            <Label htmlFor="save-default" className="text-sm font-medium">
              Save as default test email
            </Label>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-800 mb-1">What will be sent:</p>
            <ul className="text-blue-700 space-y-1">
              <li>• Subject: "Test Email from {accountName}"</li>
              <li>• Content: Test message with timestamp</li>
              <li>• From: SMTP account sender address</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleTest}
            disabled={isLoading || !testEmail.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

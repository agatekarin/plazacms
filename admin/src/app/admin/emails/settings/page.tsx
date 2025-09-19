"use client";

import { useEffect, useState } from "react";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import EmailSettingsManager from "./EmailSettingsManager";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  BarChart3,
  Settings2,
  ArrowRight,
  Activity,
  Mail,
  AlertCircle,
} from "lucide-react";

export default function EmailSettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`EmailSettingsPage API Error on ${url}:`, error);
    },
  });

  // Guard: if not authenticated or not admin, send to built-in auth
  useEffect(() => {
    if (status === "loading") return;

    const role = (session?.user as any)?.role;
    if (!session?.user || role !== "admin") {
      window.location.href = "/api/authjs/signin";
      return;
    }

    // Load email settings from API
    const loadSettings = async () => {
      try {
        const data = await apiCallJson("/api/admin/settings/email", {
          cache: "no-store",
        });
        setSettings(data.settings);
      } catch (error) {
        console.error("Failed to fetch email settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [session, status]);

  if (status === "loading" || loading)
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <EnvelopeIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure email delivery, SMTP settings, and load balancing
            </p>
          </div>
        </div>
      </div>

      {/* Multi-SMTP Quick Access */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Multi-SMTP Load Balancing
              </h3>
              <Badge variant="primary" className="text-xs">
                Enhanced
              </Badge>
            </div>
            <p className="text-gray-600 mb-4">
              Distribute email sending across multiple SMTP accounts for better
              reliability and higher throughput.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity className="h-4 w-4 text-green-500" />
                <span>Automatic failover</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span>Performance analytics</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-purple-500" />
                <span>Round-robin distribution</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/emails/settings/smtp-accounts">
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Server className="h-4 w-4" />
              Manage SMTP Accounts
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/admin/emails/analytics">
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <BarChart3 className="h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Multi-SMTP Status */}
      {settings && (settings as any).multi_smtp_enabled && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h4 className="font-medium text-gray-900">
              Multi-SMTP Status: Active
            </h4>
          </div>
          <p className="text-sm text-gray-600">
            Multi-SMTP load balancing is currently enabled. Emails will be
            distributed across your configured SMTP accounts.
          </p>
        </div>
      )}

      {/* Settings Manager */}
      <EmailSettingsManager initialSettings={settings} />
    </div>
  );
}

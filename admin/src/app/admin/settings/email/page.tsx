"use client";

import { useEffect, useState } from "react";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import EmailSettingsManager from "./EmailSettingsManager";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

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
              Configure email delivery and SMTP settings
            </p>
          </div>
        </div>
      </div>

      {/* Settings Manager */}
      <EmailSettingsManager initialSettings={settings} />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, User } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function PagePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "admin") {
          router.push("/signin");
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Page Under Migration</h1>
      <p className="text-gray-600">
        This page is being migrated to use the new Hono backend API.
        Please check back later or contact the administrator.
      </p>
    </div>
  );
}

/*
ORIGINAL CODE COMMENTED OUT:
import { Session } from "next-auth";
import { auth } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import GeneralSettingsManager from "./GeneralSettingsManager";
import { CogIcon } from "@heroicons/react/24/outline";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  // Fetch settings from API
  let settings = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const base = `${proto}://${host}`;

    const c = await cookies();

    const res = await fetch(`${base}/api/admin/settings/general`, {
      cache: "no-store",
      headers: {
        cookie: c.toString(),
      },
    });
    if (res.ok) {
      const data = await res.json();
      settings = data.settings;
    }
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
            <CogIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              General Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure your site&apos;s basic information and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Settings Manager */}
      <GeneralSettingsManager initialSettings={settings} />
    </div>
  );
}

*/

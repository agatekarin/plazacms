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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Truck,
  MapPin,
  Package,
  Network,
  Calculator,
  Settings,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

const shippingNavItems = [
  {
    href: "/admin/shipping/zones",
    label: "Shipping Zones",
    icon: MapPin,
    description: "Geographic regions and country coverage",
  },
  {
    href: "/admin/shipping/gateways",
    label: "Shipping Gateways",
    icon: Network,
    description: "Carriers and service providers",
  },
  {
    href: "/admin/shipping/methods",
    label: "Shipping Methods",
    icon: Package,
    description: "Pricing rules and calculation methods",
  },
  {
    href: "/admin/shipping/calculator",
    label: "Rate Calculator",
    icon: Calculator,
    description: "Test shipping cost calculations",
  },
  {
    href: "/admin/shipping/settings",
    label: "Settings",
    icon: Settings,
    description: "Global shipping configuration",
  },
];

interface ShippingStats {
  zones: { active: number; total: number };
  gateways: { active: number; total: number };
  methods: { active: number; total: number };
  countries_covered: number;
}

export default function ShippingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [stats, setStats] = useState<ShippingStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { apiCallJson } = useAuthenticatedFetch();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const data = await apiCallJson("/api/admin/shipping/summary", {
          cache: "no-store",
        }).catch(() => null as any);

        if (!data) return;

        // Support both legacy Next API shape (data.stats) and new Hono shape (data.totals)
        if (data.stats) {
          setStats(data.stats as ShippingStats);
        } else if (data.totals) {
          const t = data.totals as any;
          setStats({
            zones: {
              active: Number(t.zones_active || 0),
              total: Number(t.zones || 0),
            },
            gateways: {
              active: Number(t.gateways_active || 0),
              total: Number(t.gateways || 0),
            },
            methods: {
              active: Number(t.methods_active || 0),
              total: Number(t.methods || 0),
            },
            countries_covered: Number(t.countries_covered || 0),
          });
        }
      } catch (error) {
        console.error("Failed to fetch shipping stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const Sidebar = (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Management
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Zone-Gateway-Method Matrix Configuration
        </p>
      </div>

      <nav className="space-y-2">
        {shippingNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                  flex items-start gap-3 p-3 rounded-lg transition-colors
                  ${
                    isActive
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              onClick={() => setMobileOpen(false)}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              />
              <div>
                <div
                  className={`font-medium ${
                    isActive ? "text-blue-800" : "text-gray-900"
                  }`}
                >
                  {item.label}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
                    isActive ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">System Overview</h3>
        </div>

        {isLoadingStats ? (
          <div className="space-y-2 text-sm animate-pulse">
            <div className="flex justify-between">
              <span className="text-gray-600">Loading...</span>
              <div className="h-4 w-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Zones:</span>
              <span className="font-medium text-green-600">
                {stats.zones.active}/{stats.zones.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gateways:</span>
              <span className="font-medium text-blue-600">
                {stats.gateways.active}/{stats.gateways.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Methods:</span>
              <span className="font-medium text-purple-600">
                {stats.methods.active}/{stats.methods.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Countries:</span>
              <span className="font-medium text-orange-600">
                {stats.countries_covered}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No stats available</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">{Sidebar}</div>

      {/* Mobile Sidebar (Drawer) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full z-50 shadow-lg">
            <div className="h-full w-64 bg-gray-50 border-r border-gray-200">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <Truck className="h-5 w-5" /> Shipping
                </div>
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {Sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto max-w-full">
        {/* Mobile Top Bar */}
        <div className="md:hidden sticky top-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
          <div className="flex items-center justify-between p-3">
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-medium text-gray-700">Shipping</h2>
            <div className="w-5" />
          </div>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

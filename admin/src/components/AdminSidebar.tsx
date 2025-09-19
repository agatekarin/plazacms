"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  HomeIcon,
  ShoppingBagIcon,
  PhotoIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
  ChevronDownIcon,
  FolderIcon,
  SwatchIcon,
  TruckIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserIcon,
  GlobeAltIcon,
  MapIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  ChartPieIcon,
  ClockIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  PhotoIcon as PhotoIconSolid,
  TagIcon as TagIconSolid,
  AdjustmentsHorizontalIcon as AdjustmentsHorizontalIconSolid,
  UsersIcon as UsersIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CogIcon as CogIconSolid,
  EnvelopeIcon as EnvelopeIconSolid,
  PaperAirplaneIcon as PaperAirplaneIconSolid,
  ChartPieIcon as ChartPieIconSolid,
  ClockIcon as ClockIconSolid,
  ServerIcon as ServerIconSolid,
} from "@heroicons/react/24/solid";

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: Omit<MenuItem, "children">[];
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    id: "products",
    label: "Products",
    icon: ShoppingBagIcon,
    iconSolid: ShoppingBagIconSolid,
    children: [
      {
        id: "all-products",
        label: "All Products",
        href: "/admin/products",
        icon: FolderIcon,
        iconSolid: FolderIcon,
      },
      {
        id: "categories",
        label: "Categories",
        href: "/admin/categories",
        icon: TagIcon,
        iconSolid: TagIconSolid,
      },
      {
        id: "attributes",
        label: "Attributes",
        href: "/admin/attributes",
        icon: SwatchIcon,
        iconSolid: SwatchIcon,
      },
      {
        id: "product-analytics",
        label: "Analytics",
        href: "/admin/products/analytics",
        icon: ChartBarIcon,
        iconSolid: ChartBarIconSolid,
      },
      {
        id: "product-import-export",
        label: "Import/Export",
        href: "/admin/products/import-export",
        icon: DocumentTextIcon,
        iconSolid: DocumentTextIcon,
      },
    ],
  },
  {
    id: "media",
    label: "Media Library",
    href: "/admin/media",
    icon: PhotoIcon,
    iconSolid: PhotoIconSolid,
  },
  {
    id: "orders",
    label: "Orders",
    href: "/admin/orders",
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIcon,
    badge: "3",
  },

  {
    id: "transactions",
    label: "Transactions",
    href: "/admin/transactions",
    icon: CreditCardIcon,
    iconSolid: CreditCardIcon,
  },
  {
    id: "customers",
    label: "Customers",
    href: "/admin/customers",
    icon: UsersIcon,
    iconSolid: UsersIconSolid,
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    icon: UsersIcon,
    iconSolid: UsersIconSolid,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIcon,
    children: [
      {
        id: "all-reviews",
        label: "All Reviews",
        href: "/admin/reviews",
        icon: ChatBubbleLeftRightIcon,
        iconSolid: ChatBubbleLeftRightIcon,
      },
      {
        id: "review-analytics",
        label: "Analytics",
        href: "/admin/reviews/analytics",
        icon: ChartBarIcon,
        iconSolid: ChartBarIconSolid,
      },
      {
        id: "review-import-export",
        label: "Import/Export",
        href: "/admin/reviews/import-export",
        icon: DocumentTextIcon,
        iconSolid: DocumentTextIcon,
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIcon,
    children: [
      {
        id: "coupons",
        label: "Coupons",
        href: "/admin/marketing/coupons",
        icon: TagIcon,
        iconSolid: TagIconSolid,
      },
    ],
  },
  {
    id: "emails",
    label: "Email Management",
    icon: EnvelopeIcon,
    iconSolid: EnvelopeIconSolid,
    children: [
      {
        id: "email-dashboard",
        label: "Dashboard",
        href: "/admin/emails",
        icon: ChartPieIcon,
        iconSolid: ChartPieIconSolid,
      },
      {
        id: "email-templates",
        label: "Templates",
        href: "/admin/emails/templates",
        icon: DocumentTextIcon,
        iconSolid: DocumentTextIcon,
      },
      {
        id: "send-email",
        label: "Send Email",
        href: "/admin/emails/send",
        icon: PaperAirplaneIcon,
        iconSolid: PaperAirplaneIconSolid,
      },
      {
        id: "email-analytics",
        label: "Analytics",
        href: "/admin/emails/analytics",
        icon: ChartBarIcon,
        iconSolid: ChartBarIconSolid,
      },
      {
        id: "email-history",
        label: "Email History",
        href: "/admin/emails/history",
        icon: ClockIcon,
        iconSolid: ClockIconSolid,
      },
      {
        id: "email-settings",
        label: "Email Settings",
        href: "/admin/emails/settings",
        icon: CogIcon,
        iconSolid: CogIconSolid,
      },
      {
        id: "smtp-accounts",
        label: "SMTP Accounts",
        href: "/admin/emails/settings/smtp-accounts",
        icon: ServerIcon,
        iconSolid: ServerIconSolid,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: CogIcon,
    iconSolid: CogIconSolid,
    children: [
      {
        id: "general",
        label: "General",
        href: "/admin/settings/general",
        icon: CogIcon,
        iconSolid: CogIconSolid,
      },
      {
        id: "shipping-settings",
        label: "Shipping Settings",
        href: "/admin/shipping/settings",
        icon: TruckIcon,
        iconSolid: TruckIcon,
      },
      {
        id: "payments",
        label: "Payments",
        href: "/admin/settings/payments",
        icon: CreditCardIcon,
        iconSolid: CreditCardIcon,
      },
      {
        id: "tax",
        label: "Tax Settings",
        href: "/admin/settings/tax",
        icon: AdjustmentsHorizontalIcon,
        iconSolid: AdjustmentsHorizontalIconSolid,
      },
      {
        id: "locations",
        label: "Locations",
        href: "/admin/settings/locations",
        icon: GlobeAltIcon,
        iconSolid: GlobeAltIcon,
      },
    ],
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export default function AdminSidebar({
  isOpen,
  onToggle,
  isMobile = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState<string | null>(null);

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`AdminSidebar API Error on ${url}:`, error);
      // Silent fail for sidebar - keep fallback UI
    },
  });

  // Load site logo from general settings
  useEffect(() => {
    let mounted = true;

    const loadSiteSettings = async () => {
      try {
        if (!(session as any)?.accessToken) return; // Wait for session

        const data: {
          settings?: { logo_url?: string; default_avatar_url?: string };
        } = await apiCallJson("/api/admin/settings/general", {
          cache: "no-store",
        });

        if (!mounted) return;
        if (data?.settings?.logo_url) setSiteLogoUrl(data.settings.logo_url);
        if (data?.settings?.default_avatar_url)
          setDefaultAvatarUrl(data.settings.default_avatar_url);
      } catch {
        // Error already handled by useAuthenticatedFetch interceptor
        // Keep fallback UI on error
      }
    };

    loadSiteSettings();
    return () => {
      mounted = false;
    };
  }, [session]); // Re-run when session changes

  // Auto-expand parent items based on current route
  useEffect(() => {
    const newExpanded = new Set<string>();

    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.href && pathname.startsWith(child.href)
        );
        if (hasActiveChild) {
          newExpanded.add(item.id);
        }
      }
    });

    setExpandedItems(newExpanded);
  }, [pathname]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const active = isActive(item.href);
    const expanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isCollapsed = !isOpen && !isMobile;

    const IconComponent = active ? item.iconSolid : item.icon;

    const itemContent = (
      <div
        className={`flex items-center gap-3 ${
          isCollapsed ? "justify-center px-0" : "px-3"
        } py-2.5 rounded-lg group relative ${
          active
            ? isCollapsed
              ? "text-blue-600"
              : "bg-blue-600 text-white"
            : hasChildren && !item.href
            ? `text-gray-700 ${expanded ? "bg-gray-100" : "hover:bg-gray-100"}`
            : level > 0
            ? "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <span
          className={`${
            isCollapsed
              ? `p-2 rounded-lg ${active ? "bg-blue-600" : "hover:bg-blue-50"}`
              : ""
          }`}
        >
          <IconComponent
            className={`h-5 w-5 flex-shrink-0 ${
              active
                ? "text-white"
                : level > 0
                ? "text-gray-400 group-hover:text-blue-600"
                : "text-gray-500"
            }`}
          />
        </span>

        <span
          className={`font-medium text-sm flex-1 ${
            isCollapsed ? "sr-only" : ""
          }`}
        >
          {item.label}
        </span>

        {item.badge && (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              active ? "bg-blue-500 text-white" : "bg-red-100 text-red-800"
            } ${!isOpen && !isMobile ? "sr-only" : ""}`}
          >
            {item.badge}
          </span>
        )}

        {hasChildren && (isOpen || isMobile) && (
          <ChevronDownIcon
            className={`h-4 w-4 ${expanded ? "rotate-0" : "-rotate-90"} ${
              active && !isCollapsed ? "text-white" : "text-gray-400"
            }`}
          />
        )}
      </div>
    );

    return (
      <div key={item.id}>
        {item.href ? (
          <Link href={item.href} onClick={() => isMobile && onToggle()}>
            {itemContent}
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.id)}
            className="w-full text-left"
          >
            {itemContent}
          </button>
        )}

        {hasChildren && expanded && (isOpen || isMobile) && (
          <div className="mt-1 space-y-1 ml-8">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in-0 duration-200"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        ${isMobile ? "fixed inset-y-0 left-0 z-50" : "sticky top-0 self-start"}
        bg-white border-r border-gray-200 shadow-lg
        transition-all duration-300 ease-in-out
        ${isMobile ? (isOpen ? "w-72" : "w-0") : isOpen ? "w-72" : "w-16"}
        ${isMobile && !isOpen ? "overflow-hidden" : "overflow-visible"}
        flex flex-col h-screen
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 min-h-[80px]">
          <div
            className={`flex items-center gap-3 ${
              !isOpen && !isMobile ? "justify-center w-full" : ""
            }`}
          >
            {siteLogoUrl ? (
              <img
                src={siteLogoUrl}
                alt="Site Logo"
                className="w-8 h-8 object-contain rounded-md flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">P</span>
              </div>
            )}
            {(isOpen || isMobile) && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  PlazaCMS
                </h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            )}
          </div>

          {isMobile && isOpen && (
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* User Info */}
        {session?.user && (isOpen || isMobile) && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {session.user.image || defaultAvatarUrl ? (
                  <img
                    src={(session.user.image || defaultAvatarUrl) as string}
                    alt={session.user.name || "User"}
                    className="w-10 h-10 object-cover"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {(session.user as unknown as { role?: string }).role ||
                    "Admin"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Footer (empty; actions moved to header user menu) */}
        <div className="p-4 border-t border-gray-200" />
      </div>
    </>
  );
}

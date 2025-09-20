"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

export default function EmailRotationBreadcrumb() {
  const pathname = usePathname();

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: "Email Management", href: "/admin/emails" },
    ];

    if (pathname === "/admin/emails/rotation") {
      items.push({
        label: "Rotation Dashboard",
        icon: ChartBarIcon,
        current: true,
      });
    } else if (pathname === "/admin/emails/rotation/providers") {
      items.push(
        { label: "Rotation", href: "/admin/emails/rotation" },
        {
          label: "API Providers",
          icon: Cog6ToothIcon,
          current: true,
        }
      );
    } else if (pathname === "/admin/emails/rotation/config") {
      items.push(
        { label: "Rotation", href: "/admin/emails/rotation" },
        {
          label: "Configuration",
          icon: AdjustmentsHorizontalIcon,
          current: true,
        }
      );
    } else if (pathname === "/admin/emails/rotation/analytics") {
      items.push(
        { label: "Rotation", href: "/admin/emails/rotation" },
        {
          label: "Analytics",
          icon: ChartBarIcon,
          current: true,
        }
      );
    } else if (pathname === "/admin/emails/rotation/logs") {
      items.push(
        { label: "Rotation", href: "/admin/emails/rotation" },
        {
          label: "Logs",
          icon: DocumentTextIcon,
          current: true,
        }
      );
    } else if (pathname.startsWith("/admin/emails/rotation")) {
      items.push({
        label: "Email Rotation",
        icon: ChartBarIcon,
        current: true,
      });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 md:space-x-3">
        {breadcrumbItems.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mx-1 md:mx-2" />
              )}

              {item.current ? (
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href!}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

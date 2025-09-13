"use client";

import { Bars3Icon } from "@heroicons/react/24/outline";

interface MobileMenuButtonProps {
  onClick: () => void;
  className?: string;
  isOpen?: boolean;
}

export default function MobileMenuButton({ onClick, className = "", isOpen = false }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-2 rounded-lg hover:bg-gray-100
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all duration-200
        ${className}
      `}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <Bars3Icon className="h-6 w-6 text-gray-700" />
    </button>
  );
}
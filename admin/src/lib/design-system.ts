/**
 * PlazaCMS Design System
 * Consistent colors, typography, and spacing for admin panel
 */

export const designSystem = {
  colors: {
    // Primary Brand Colors (Blue)
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6", // Main primary
      600: "#2563eb", // Hover state
      700: "#1d4ed8", // Active state
      800: "#1e40af",
      900: "#1e3a8a",
    },

    // Semantic Colors
    success: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e", // Main success
      600: "#16a34a", // Hover state
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
    },

    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b", // Main warning
      600: "#d97706", // Hover state
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },

    danger: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444", // Main danger
      600: "#dc2626", // Hover state
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
    },

    // Neutral Grays
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
  },

  // Typography Scale
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "Consolas", "monospace"],
    },
    fontSize: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Spacing Scale
  spacing: {
    xs: "0.5rem", // 8px
    sm: "0.75rem", // 12px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
  },

  // Border Radius
  borderRadius: {
    sm: "0.375rem", // 6px
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
  },

  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
} as const;

// Semantic Color Mappings
export const semanticColors = {
  // Status Colors
  published: designSystem.colors.success[500],
  draft: designSystem.colors.warning[500],
  archived: designSystem.colors.gray[500],

  // Stock Status Colors
  inStock: designSystem.colors.success[500],
  lowStock: designSystem.colors.warning[500],
  outOfStock: designSystem.colors.danger[500],

  // Action Colors
  edit: designSystem.colors.primary[500],
  delete: designSystem.colors.danger[500],
  view: designSystem.colors.gray[500],
} as const;

// Component Variants
export const componentVariants = {
  button: {
    primary: {
      bg: "bg-blue-600",
      hover: "hover:bg-blue-700",
      text: "text-white",
      border: "border-blue-600",
    },
    secondary: {
      bg: "bg-gray-100",
      hover: "hover:bg-gray-200",
      text: "text-gray-900",
      border: "border-gray-300",
    },
    success: {
      bg: "bg-green-600",
      hover: "hover:bg-green-700",
      text: "text-white",
      border: "border-green-600",
    },
    warning: {
      bg: "bg-yellow-600",
      hover: "hover:bg-yellow-700",
      text: "text-white",
      border: "border-yellow-600",
    },
    danger: {
      bg: "bg-red-600",
      hover: "hover:bg-red-700",
      text: "text-white",
      border: "border-red-600",
    },
    outline: {
      bg: "bg-white",
      hover: "hover:bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-300",
    },
    ghost: {
      bg: "bg-transparent",
      hover: "hover:bg-gray-100",
      text: "text-gray-600",
      border: "border-transparent",
    },
    link: {
      bg: "bg-transparent",
      hover: "hover:underline",
      text: "text-blue-600",
      border: "border-transparent",
    },
  },

  badge: {
    default: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-200",
    },
    primary: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
    },
    secondary: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-200",
    },
    outline: {
      bg: "bg-white",
      text: "text-gray-600",
      border: "border-gray-300",
    },
    published: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
    },
    draft: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-200",
    },
    archived: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-200",
    },
    success: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
    },
    warning: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-200",
    },
    danger: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-200",
    },
  },
} as const;

export type ButtonVariant = keyof typeof componentVariants.button;
export type BadgeVariant = keyof typeof componentVariants.badge;

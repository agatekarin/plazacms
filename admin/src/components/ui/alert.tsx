"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive";
}

export const Alert: React.FC<AlertProps> = ({
  children,
  className = "",
  variant = "default",
}) => {
  const variantClasses = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    destructive: "bg-red-50 border-red-200 text-red-800",
  };

  const baseClasses = [
    "relative w-full rounded-lg border p-4 flex items-start gap-3",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="alert" className={baseClasses}>
      {children}
    </div>
  );
};

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={cn("text-sm leading-relaxed", className)}>{children}</div>
  );
};
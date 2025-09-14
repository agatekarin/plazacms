"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface ModernOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  intensity?: "light" | "medium" | "dark";
  closeOnClickOutside?: boolean;
}

interface ModernModalProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function ModernOverlay({
  isOpen,
  onClose,
  children,
  className,
  size = "md",
  intensity = "medium",
  closeOnClickOutside = true,
}: ModernOverlayProps) {
  if (!isOpen) return null;

  const intensityClasses = {
    light: "bg-black/10",
    medium: "bg-black/20", 
    dark: "bg-black/40",
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4",
        "animate-in fade-in-0 duration-300",
        intensityClasses[intensity],
        className
      )}
      onClick={handleBackdropClick}
    >
      <ModernModal size={size}>
        {children}
      </ModernModal>
    </div>
  );
}

export function ModernModal({ children, className, size = "md" }: ModernModalProps) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-2xl", 
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-7xl",
  };

  return (
    <div 
      className={cn(
        "w-full max-h-[90vh] flex flex-col",
        "bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20",
        "animate-in zoom-in-95 duration-300",
        sizeClasses[size],
        className
      )}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
    >
      {children}
    </div>
  );
}

interface ModernModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function ModernModalHeader({ 
  title, 
  subtitle, 
  onClose, 
  actions,
  className 
}: ModernModalHeaderProps) {
  return (
    <div className={cn("p-6 border-b border-gray-200/50 flex items-center justify-between", className)}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100/80 transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface ModernModalContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function ModernModalContent({ children, className, padding = "md" }: ModernModalContentProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6", 
    lg: "p-8",
  };

  return (
    <div className={cn(
      "flex-1 overflow-auto",
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

interface ModernModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModernModalFooter({ children, className }: ModernModalFooterProps) {
  return (
    <div className={cn("p-6 border-t border-gray-200/50 flex items-center justify-end gap-3", className)}>
      {children}
    </div>
  );
}

// Glass effect hover overlay for images/cards
interface GlassHoverOverlayProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "light" | "medium" | "dark";
}

export function GlassHoverOverlay({ children, className, intensity = "medium" }: GlassHoverOverlayProps) {
  const intensityClasses = {
    light: "from-black/40 via-black/20",
    medium: "from-black/60 via-black/30", 
    dark: "from-black/80 via-black/50",
  };

  return (
    <div className={cn(
      "absolute inset-0 rounded-lg flex items-center justify-center",
      "bg-gradient-to-t to-transparent backdrop-blur-[2px]",
      "opacity-0 group-hover:opacity-100 transition-all duration-300",
      intensityClasses[intensity],
      className
    )}>
      {children}
    </div>
  );
}

// Modern glass buttons for overlays
interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
}

export function GlassButton({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md",
  className 
}: GlassButtonProps) {
  const variantClasses = {
    primary: "bg-white/90 text-gray-900 hover:bg-white",
    secondary: "bg-gray-900/80 text-white hover:bg-gray-900",
    danger: "bg-red-500/90 text-white hover:bg-red-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "backdrop-blur-sm rounded-lg font-medium shadow-lg border border-white/50",
        "hover:shadow-xl transition-all duration-200 transform hover:scale-105",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  );
}
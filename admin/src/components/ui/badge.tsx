"use client";

import React from 'react';
import { componentVariants, type BadgeVariant } from '@/lib/design-system';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}) => {
  const variantClasses = componentVariants.badge[variant] || componentVariants.badge.default;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const baseClasses = [
    'inline-flex items-center',
    'font-medium rounded-full border',
    sizeClasses[size],
    variantClasses.bg,
    variantClasses.text,
    variantClasses.border,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={baseClasses}>
      {children}
    </span>
  );
};

// Status Badge Components
export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ 
  status, 
  className 
}) => {
  const statusVariants: Record<string, BadgeVariant> = {
    published: 'published',
    draft: 'draft',
    archived: 'archived',
    active: 'success',
    inactive: 'archived',
  };

  const variant = statusVariants[status.toLowerCase()] || 'draft';

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
};

// Stock Badge Component
export const StockBadge: React.FC<{ stock: number; className?: string }> = ({ 
  stock, 
  className 
}) => {
  if (stock <= 0) {
    return (
      <Badge variant="danger" className={className}>
        Out of stock
      </Badge>
    );
  } else if (stock <= 10) {
    return (
      <Badge variant="warning" className={className}>
        Low ({stock})
      </Badge>
    );
  } else {
    return (
      <Badge variant="success" className={className}>
        In stock ({stock})
      </Badge>
    );
  }
};

// Preset Badge Components
export const SuccessBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="success" {...props} />
);

export const WarningBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="warning" {...props} />
);

export const DangerBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => (
  <Badge variant="danger" {...props} />
);
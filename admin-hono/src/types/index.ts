import { z } from "zod";

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

// Product Attribute types
export interface ProductAttribute {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttributeItem {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  sku: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  manage_stock: boolean;
  stock_status: string;
  weight?: number;
  dimensions?: string;
  category_id?: string;
  image_url?: string;
  gallery?: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
}

// Validation schemas
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const attributeSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  values: z.array(z.string()).optional().default([]),
});

export const attributeValueSchema = z.object({
  value: z.string().min(1, "Value is required").max(255, "Value too long"),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug too long"),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  slug: z.string().min(1, "Slug is required").max(255, "Slug too long"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  sku: z.string().min(1, "SKU is required").max(100, "SKU too long"),
  price: z.number().min(0, "Price must be positive"),
  sale_price: z.number().min(0, "Sale price must be positive").optional(),
  stock_quantity: z
    .number()
    .int()
    .min(0, "Stock must be non-negative")
    .default(0),
  manage_stock: z.boolean().default(true),
  stock_status: z
    .enum(["in_stock", "out_of_stock", "on_backorder"])
    .default("in_stock"),
  weight: z.number().min(0).optional(),
  dimensions: z.string().optional(),
  category_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  gallery: z.array(z.string().url()).optional().default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

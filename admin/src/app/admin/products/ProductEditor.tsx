"use client";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  regular_price: number;
  currency: string;
  stock: number;
  category_id: string | null;
  status: "draft" | "published";
  sku: string | null;
  weight: number | null;
  sale_price: number | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  tax_class_id: string | null;
  product_type: "simple" | "variable";
}

interface MediaItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  size: number;
  alt_text?: string;
  media_type: string;
  folder_name?: string;
  folder_path?: string;
  uploaded_by_name?: string;
  created_at: string;
}

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import MediaPicker from "@/components/MediaPicker";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

import "@/styles/tiptap.css";

const TiptapEditor = dynamic(() => import("@/components/TiptapEditor"), {
  ssr: false,
});

import {
  Save,
  Eye,
  ArrowLeft,
  Package,
  Tag,
  Settings,
  Layers,
  Image as ImageIcon,
  Star,
  Plus,
  Minus,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Globe,
  ShoppingCart,
  Truck,
  Zap,
  BarChart3,
  Grid3X3,
  DollarSign,
  Calendar,
} from "lucide-react";

export type CategoryOption = { id: string; name: string };
export type TaxClassOption = { id: string; name: string; rate: string };

type ProductEditorProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  taxClasses: TaxClassOption[];
  initialProduct?: Product;
  initialTab?:
    | "general"
    | "inventory"
    | "shipping"
    | "advanced"
    | "attributes"
    | "variations";
};

// Modern UI building blocks with enhanced design
function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200/60 bg-white shadow-sm backdrop-blur-sm ${
        className || ""
      }`}
    >
      {children}
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        {icon && <div className="text-gray-600">{icon}</div>}
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  help,
  children,
  icon,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gray-500 text-sm">{icon}</div>}
        <label className="text-sm font-medium text-gray-900">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      </div>
      {help && <p className="text-xs text-gray-500">{help}</p>}
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { value, onChange, className, ...rest } = props;
  const hasOnChange = typeof onChange === "function";
  const hasValue = value !== undefined && value !== null;
  return (
    <input
      {...rest}
      {...(hasOnChange
        ? { value: String((value as any) ?? ""), onChange }
        : hasValue
        ? { defaultValue: String((value as any) ?? "") }
        : {})}
      className={[
        "h-10 rounded-lg border border-gray-300 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { value, onChange, className, ...rest } = props;
  const hasOnChange = typeof onChange === "function";
  const hasValue = value !== undefined && value !== null;
  return (
    <textarea
      {...rest}
      {...(hasOnChange
        ? { value: String((value as any) ?? ""), onChange }
        : hasValue
        ? { defaultValue: String((value as any) ?? "") }
        : {})}
      className={[
        "min-h-[120px] rounded-lg border border-gray-300 p-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { value, onChange, className, ...rest } = props;
  const hasOnChange = typeof onChange === "function";
  const hasValue = value !== undefined && value !== null;
  return (
    <select
      {...rest}
      {...(hasOnChange
        ? { value: String((value as any) ?? ""), onChange }
        : hasValue
        ? { defaultValue: String((value as any) ?? "") }
        : {})}
      className={[
        "h-10 rounded-lg border border-gray-300 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  ...props
}: {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
    md: "px-4 py-2 text-sm rounded-lg gap-2",
    lg: "px-6 py-3 text-base rounded-lg gap-2",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${
        className || ""
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

function toLocalDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Attribute types for variants
type Attribute = {
  id: string;
  name: string;
  values: Array<{ id: string; value: string }>;
};

type VariantRow = {
  id: string;
  sku: string | null;
  stock: number;
  weight: number | null;
  regular_price: number | null;
  sale_price: number | null;
  sale_start_date?: string | null;
  sale_end_date?: string | null;
  status: string;
  attributes: Array<{
    id: string;
    value: string;
    attribute_id: string;
    attribute_name: string;
  }>;
  image_url?: string | null;
  image_id?: string | null;
};

type ProductImage = {
  media_id: string;
  file_url: string;
  display_order: number;
  alt_text?: string | null;
  filename?: string;
  file_type?: string;
  size?: number;
};

export default function ProductEditor({
  mode,
  categories,
  taxClasses,
  initialProduct,
  initialTab,
}: ProductEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();

  // Enhanced API Helper with global error handling and retry logic
  const {
    apiCall,
    apiCallJson,
    isLoading: apiLoading,
  } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`ProductEditor API Error on ${url}:`, error);
      toast.error(error?.message || "API request failed");
    },
  });

  // Tabs & product type - auto-detect from database or URL
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "inventory"
    | "shipping"
    | "advanced"
    | "attributes"
    | "variations"
  >(initialTab || "general");
  const [productType, setProductType] = useState<"simple" | "variable">(() => {
    // Priority 1: From database (existing product)
    if (initialProduct?.product_type) {
      return initialProduct.product_type as "simple" | "variable";
    }
    // Priority 2: From URL tab (new product)
    if (initialTab === "variations" || initialTab === "attributes") {
      return "variable";
    }
    // Default: simple
    return "simple";
  });

  // Base form mapped to schema
  const [form, setForm] = useState({
    name: initialProduct?.name || "",
    slug: initialProduct?.slug || "",
    description: initialProduct?.description || "",
    regular_price: initialProduct?.regular_price?.toString?.() || "",
    currency: initialProduct?.currency || "USD",
    stock: (initialProduct?.stock ?? 0).toString(),
    category_id: initialProduct?.category_id || "",
    status: (initialProduct?.status as string) || "draft",
    sku: initialProduct?.sku || "",
    weight: (initialProduct?.weight ?? 0).toString(),
    sale_price: initialProduct?.sale_price
      ? Number(initialProduct.sale_price)
      : null,
    sale_start_date: initialProduct?.sale_start_date
      ? toLocalDateTime(initialProduct.sale_start_date)
      : "",
    sale_end_date: initialProduct?.sale_end_date
      ? toLocalDateTime(initialProduct.sale_end_date)
      : "",
    tax_class_id: initialProduct?.tax_class_id || "",
  });

  // Existing or draft product id (enables inline variant features before save)
  const [productId, setProductId] = useState<string | null>(
    initialProduct?.id || null
  );

  // Sync productId when initialProduct prop becomes available (e.g., edit page after fetch)
  useEffect(() => {
    if (initialProduct?.id) setProductId(initialProduct.id);
  }, [initialProduct?.id]);

  // Hydrate form and productType when initialProduct changes (edit page)
  useEffect(() => {
    if (!initialProduct) return;
    setForm({
      name: initialProduct.name || "",
      slug: initialProduct.slug || "",
      description: initialProduct.description || "",
      regular_price:
        initialProduct.regular_price !== undefined &&
        initialProduct.regular_price !== null
          ? String(initialProduct.regular_price)
          : "",
      currency: initialProduct.currency || "USD",
      stock: String(initialProduct.stock ?? 0),
      category_id: initialProduct.category_id || "",
      status: (initialProduct.status as string) || "draft",
      sku: initialProduct.sku || "",
      weight: String(initialProduct.weight ?? 0),
      sale_price:
        initialProduct.sale_price !== undefined &&
        initialProduct.sale_price !== null
          ? Number(initialProduct.sale_price)
          : null,
      sale_start_date: initialProduct.sale_start_date
        ? toLocalDateTime(initialProduct.sale_start_date)
        : "",
      sale_end_date: initialProduct.sale_end_date
        ? toLocalDateTime(initialProduct.sale_end_date)
        : "",
      tax_class_id: initialProduct.tax_class_id || "",
    });
    if (
      initialProduct.product_type === "variable" ||
      initialProduct.product_type === "simple"
    ) {
      setProductType(initialProduct.product_type);
    }
  }, [initialProduct]);

  // Variants support
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({}); // attributeId -> valueIds
  // const [autoGenerate, setAutoGenerate] = useState(true); // Removed auto-generate state

  // Inline variations state
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkValue, setBulkValue] = useState<string>("");
  const [bulkPercent, setBulkPercent] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Product images with MediaPicker integration
  const [images, setImages] = useState<ProductImage[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<"single" | "multiple">(
    "single"
  );
  const [mediaPickerType, setMediaPickerType] = useState<
    "product_image" | "product_variant_image"
  >("product_image");
  const [currentPickerTarget, setCurrentPickerTarget] = useState<
    "featured" | "gallery" | "variant"
  >("featured");
  const [currentVariantId, setCurrentVariantId] = useState<
    string | undefined
  >();
  // Formatter for prices based on product currency
  const priceFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: form.currency || "USD",
      });
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
      });
    }
  }, [form.currency]);

  const filteredVariants = useMemo(() => {
    let list = variants;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) =>
          (v.attributes || []).some((a) => a.value.toLowerCase().includes(q)) ||
          (v.sku || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter);
    }
    return list;
  }, [variants, search, statusFilter]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function expandAll() {
    setExpandedIds(new Set(filteredVariants.map((v) => v.id)));
  }
  function collapseAll() {
    setExpandedIds(new Set());
  }

  function exportVariations() {
    const data = filteredVariants.map((v) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      weight: v.weight,
      regular_price: v.regular_price,
      sale_price: v.sale_price,
      status: v.status,
      attributes: v.attributes,
    }));
    const blob = new Blob([JSON.stringify({ variations: data }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `variations-${form.name || "product"}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importVariationsFile(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || !Array.isArray(json.variations)) {
        toast.error("File tidak valid");
        return;
      }
      // For now: update existing variants by id
      for (const v of json.variations) {
        if (!v?.id) continue;
        await saveVariantRow({
          id: v.id,
          sku: v.sku ?? null,
          stock: Number(v.stock) || 0,
          weight: Number(v.weight) || null,
          regular_price: v.regular_price ?? null,
          sale_price: v.sale_price ?? null,
          status: typeof v.status === "string" ? v.status : "draft",
          attributes: v.attributes || [],
          image_url: undefined,
          image_id: undefined,
        });
      }
      // refresh
      if (productId) {
        await loadVariants();
      }
    } catch {
      toast.error("Gagal import file");
    }
  }

  // Load attributes when variable product chosen
  useEffect(() => {
    if (productType !== "variable") return;
    let cancelled = false;

    const loadAttributes = async () => {
      try {
        const data = await apiCallJson("/api/admin/attributes");
        if (!cancelled) {
          setAttributes(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        // Error already handled by useAuthenticatedFetch interceptor
        if (!cancelled) setAttributes([]);
      }
    };

    loadAttributes();
    return () => {
      cancelled = true;
    };
  }, [productType]);

  // Function to load variants data
  async function loadVariants() {
    if (!productId) return;
    try {
      const data = await apiCallJson(
        `/api/admin/products/${productId}/variants`,
        {}
      );
      setVariants(data.items || []);
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to load variants:", error);
      setVariants([]);
    }
  }

  // Load variants when we have a product id and variations tab is active
  useEffect(() => {
    if (!productId) return;
    if (activeTab !== "variations" && initialTab !== "variations") return;
    loadVariants();
  }, [productId, activeTab, initialTab]);

  // Load product images when we have a product id
  useEffect(() => {
    if (productId) {
      loadProductImages();
    }
  }, [productId]);

  function toggleSelection(attributeId: string, valueId: string) {
    setSelections((prev) => {
      const current = new Set(prev[attributeId] || []);
      if (current.has(valueId)) current.delete(valueId);
      else current.add(valueId);
      return { ...prev, [attributeId]: Array.from(current) };
    });
  }

  const cartesianPreview = useMemo(() => {
    const arrays = Object.values(selections).filter((arr) => arr.length > 0);
    if (!arrays.length) return 0;
    return arrays.reduce((acc, arr) => acc * arr.length, 1);
  }, [selections]);

  const canPublish = useMemo(
    () =>
      !!form.name.trim() && !!form.slug.trim() && !!form.regular_price.trim(),
    [form]
  );

  function onChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onDescriptionChange(value: string) {
    setForm((f) => ({ ...f, description: value }));
  }

  function generateSlug() {
    if (!form.name) return;
    const slug = form.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$|/g, "")
      .trim();
    setForm((f) => ({ ...f, slug }));
  }

  function fallbackSlug(base?: string) {
    const stem =
      base && base.trim()
        ? base
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
        : "product";
    return `${stem}-${Date.now()}`;
  }

  async function ensureDraftProduct(): Promise<string | null> {
    if (productId) return productId;
    // In edit mode, never auto-create a draft if the product hasn't loaded yet
    if (mode === "edit") return null;
    try {
      const payload = {
        name: form.name.trim() || "Untitled product",
        slug: (form.slug.trim() || fallbackSlug(form.name)) as string,
        description: form.description.trim() || null,
        regular_price: Number(form.regular_price || 0),
        currency: form.currency || "USD",
        stock: Number(form.stock || 0),
        category_id: form.category_id || null,
        status: "draft" as const,
        sku: form.sku || null,
        weight: Math.max(0, Math.floor(Number(form.weight || 0))),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        sale_start_date: form.sale_start_date || null,
        sale_end_date: form.sale_end_date || null,
        tax_class_id: form.tax_class_id || null,
        product_type: productType,
      };
      const data = await apiCallJson("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const id = data?.item?.id as string | undefined;
      if (id) {
        setProductId(id);
        if (!form.slug.trim() && data.item.slug)
          setForm((f) => ({ ...f, slug: data.item.slug }));
        return id;
      }
      return null;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Network error");
      toast.error(e instanceof Error ? e.message : "Network error");
      return null;
    }
  }

  async function generateVariantsInline() {
    const arrays = Object.values(selections).filter((arr) => arr.length > 0);
    if (!arrays.length) {
      toast.error("Pilih minimal 1 nilai atribut untuk generate varian");
      return;
    }
    const id = await ensureDraftProduct();
    if (!id) return;
    try {
      await apiCallJson(`/api/admin/products/${id}/variants/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: arrays }),
      });
      // refresh list
      const data = await apiCallJson(`/api/admin/products/${id}/variants`);
      setVariants(data.items || []);
      toast.success("Variants generated");
    } catch (e: unknown) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to generate variants:", e);
    }
  }

  async function createOrUpdate(statusOverride?: "draft" | "published") {
    const payload = {
      name: form.name.trim() || "Untitled product",
      slug: (form.slug.trim() || fallbackSlug(form.name)) as string,
      description: form.description.trim() || null,
      regular_price: Number(form.regular_price || 0),
      currency: form.currency || "USD",
      stock: Number(form.stock || 0),
      category_id: form.category_id || null,
      status: statusOverride ?? (form.status || "draft"),
      sku: form.sku || null,
      weight: Math.max(0, Math.floor(Number(form.weight || 0))),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      sale_start_date: form.sale_start_date || null,
      sale_end_date: form.sale_end_date || null,
      tax_class_id: form.tax_class_id || null,
      product_type: productType,
    };

    startTransition(() => {
      (async () => {
        try {
          if (productId) {
            await apiCallJson(`/api/admin/products/${productId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            toast.success("Product updated");
            router.refresh();
          } else {
            // If we're in edit mode but product hasn't loaded yet, block accidental create
            if (mode === "edit") {
              toast.error("Product belum siap, tunggu sampai data terload");
              return;
            }
            const data = await apiCallJson("/api/admin/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const newId = data?.item?.id as string | undefined;
            if (newId) setProductId(newId);
            // Removed auto-generate variants after create, if desired
            toast.success("Product created");
            setTimeout(() => router.push("/admin/products"), 400);
          }
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Network error");
          toast.error(e instanceof Error ? e.message : "Network error");
        }
      })();
    });
  }

  function saveDraft() {
    createOrUpdate("draft");
  }

  function publish() {
    createOrUpdate("published");
  }

  // Variations helpers
  const allSelected =
    variants.length > 0 && selectedIds.size === variants.length;
  function toggleAllVariants() {
    setSelectedIds((prev) => {
      if (variants.length === 0) return prev;
      if (prev.size === variants.length) return new Set();
      return new Set(variants.map((v) => v.id));
    });
  }
  function toggleOneVariant(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function applyBulkVariants() {
    if (!productId || !bulkAction || selectedIds.size === 0) return;
    // Handle bulk delete separately by calling DELETE per-variant
    if (bulkAction === "delete_selected") {
      if (
        !confirm(
          `Delete ${selectedIds.size} selected variant(s)? This action cannot be undone.`
        )
      )
        return;
      try {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            apiCallJson(`/api/admin/products/${productId}/variants/${id}`, {
              method: "DELETE",
            })
          )
        );
        toast.success(
          `${selectedIds.size} variant${
            selectedIds.size > 1 ? "s" : ""
          } deleted`
        );
        setSelectedIds(new Set());
        setBulkAction("");
        setBulkValue("");
        setBulkPercent("");
        await loadVariants();
      } catch (err) {
        // Error already handled by useAuthenticatedFetch interceptor
        console.error("Bulk delete failed:", err);
      }
      return;
    }
    const body: Record<string, unknown> = {
      // Using Record<string, unknown> for flexibility in bulk actions
      // Using Record<string, any> for flexibility in bulk actions
      action: bulkAction,
      variant_ids: Array.from(selectedIds),
    };
    if (
      bulkAction === "set_regular_prices" ||
      bulkAction === "set_sale_prices" ||
      bulkAction === "set_stock_quantities" ||
      bulkAction === "set_weights"
    ) {
      const v = Number(bulkValue);
      if (Number.isNaN(v)) return toast.error("Nilai tidak valid");
      body.value = v;
    }
    if (
      bulkAction === "increase_regular_prices" ||
      bulkAction === "decrease_regular_prices"
    ) {
      const p = Number(bulkPercent);
      if (Number.isNaN(p)) return toast.error("Persentase tidak valid");
      body.percent = p;
    }
    if (bulkAction === "set_status") body.status = bulkValue || "draft";
    try {
      await apiCallJson(`/api/admin/products/${productId}/variants/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSelectedIds(new Set());
      setBulkAction("");
      setBulkValue("");
      setBulkPercent("");
      await loadVariants();
    } catch (err) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Bulk operation failed:", err);
    }
  }

  // Media picker handlers
  function openFeaturedImagePicker() {
    setCurrentPickerTarget("featured");
    setMediaPickerMode("single");
    setMediaPickerType("product_image");
    setCurrentVariantId(undefined);
    setShowMediaPicker(true);
  }

  function openGalleryPicker() {
    setCurrentPickerTarget("gallery");
    setMediaPickerMode("multiple");
    setMediaPickerType("product_image");
    setCurrentVariantId(undefined);
    setShowMediaPicker(true);
  }

  function openVariantImagePicker(variantId: string) {
    setCurrentPickerTarget("variant");
    setMediaPickerMode("single");
    setMediaPickerType("product_variant_image");
    setCurrentVariantId(variantId);
    setShowMediaPicker(true);
  }

  async function handleMediaSelect(selectedMedia: MediaItem[]) {
    if (!productId || selectedMedia.length === 0) return;

    try {
      if (currentPickerTarget === "featured") {
        // Set featured image - remove existing featured and add new one as first
        await apiCallJson(`/api/admin/products/${productId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_id: selectedMedia[0].id,
            display_order: 0,
            replace_featured: true,
          }),
        });
      } else if (currentPickerTarget === "gallery") {
        // Add gallery images
        for (const media of selectedMedia) {
          await apiCallJson(`/api/admin/products/${productId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_id: media.id,
              display_order: images.length + 1,
            }),
          });
        }
      } else if (currentPickerTarget === "variant" && currentVariantId) {
        // Set variant image
        await apiCallJson(
          `/api/admin/products/${productId}/variants/${currentVariantId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_id: selectedMedia[0].id,
            }),
          }
        );
      }

      // Reload images
      await loadProductImages();

      // If variant image was set, reload variants to show updated image
      if (currentPickerTarget === "variant") {
        await loadVariants();
      }

      toast.success("Images updated successfully");
    } catch (error) {
      toast.error("Failed to update images");
    }
  }

  async function loadProductImages() {
    if (!productId) return;
    try {
      console.log("Loading product images for product:", productId);
      const data = await apiCallJson(
        `/api/admin/products/${productId}/media`,
        {}
      );
      console.log("Product images API response:", data);
      if (data.success) {
        setImages(data.images || []);
        console.log("Set product images:", data.images?.length || 0, "images");
      } else {
        console.error("API returned error:", data.error);
      }
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to load product images:", error);
    }
  }

  async function removeProductImage(mediaId: string) {
    if (!productId) return;
    try {
      await apiCallJson(`/api/admin/products/${productId}/media/${mediaId}`, {
        method: "DELETE",
      });
      await loadProductImages();
      toast.success("Image removed successfully");
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to remove image:", error);
    }
  }

  async function setAsFeatured(mediaId: string) {
    if (!productId) return;
    try {
      await apiCallJson(`/api/admin/products/${productId}/media/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_id: mediaId,
          display_order: 0,
        }),
      });
      await loadProductImages();
      toast.success("Featured image updated");
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to update featured image:", error);
    }
  }
  async function saveVariantRow(row: VariantRow) {
    if (!productId) return;
    const payload = {
      sku: row.sku || null,
      stock: Number(row.stock) || 0,
      weight:
        row.weight !== null && row.weight !== undefined
          ? Math.max(0, Math.floor(Number(row.weight)))
          : null,
      regular_price:
        row.regular_price !== null && row.regular_price !== undefined
          ? Number(row.regular_price)
          : null,
      sale_price:
        row.sale_price !== null && row.sale_price !== undefined
          ? Number(row.sale_price)
          : null,
      status: row.status,
    };
    try {
      await apiCallJson(`/api/admin/products/${productId}/variants/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Variant updated");
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to update variant:", error);
    }
  }
  async function deleteVariantRow(id: string) {
    if (!productId) return;
    if (!confirm("Hapus varian ini?")) return;
    try {
      await apiCallJson(`/api/admin/products/${productId}/variants/${id}`, {
        method: "DELETE",
      });
      setVariants((vs) => vs.filter((v) => v.id !== id));
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to delete variant:", error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Modern Header */}
      <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="shrink-0"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div className="border-l border-gray-200 pl-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {productId ? "Edit Product" : "Create New Product"}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {productId
                        ? `Product ID: ${productId.slice(0, 8)}`
                        : "Build your product catalog"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {productId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(`/products/${form.slug}`, "_blank")
                  }
                  disabled={!form.slug}
                >
                  <Eye size={16} />
                  Preview
                </Button>
              )}

              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isPending}
                size="sm"
              >
                <Save size={16} />
                Save Draft
              </Button>

              <Button
                variant="primary"
                onClick={publish}
                disabled={!canPublish || isPending}
                size="sm"
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Globe size={16} />
                )}
                {productId ? "Update" : "Publish"}
              </Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    form.status === "published"
                      ? "bg-green-100 text-green-800"
                      : form.status === "draft"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {form.status === "published" && (
                    <Globe className="w-3 h-3 inline mr-1" />
                  )}
                  {form.status === "draft" && (
                    <Edit3 className="w-3 h-3 inline mr-1" />
                  )}
                  {form.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500">Type:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {productType === "variable" && (
                    <Layers className="w-3 h-3 inline mr-1" />
                  )}
                  {productType === "simple" && (
                    <Package className="w-3 h-3 inline mr-1" />
                  )}
                  {productType === "variable"
                    ? "Variable Product"
                    : "Simple Product"}
                </span>
              </div>

              {form.sku && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">SKU:</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {form.sku}
                  </span>
                </div>
              )}

              {productId && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Last updated:</span>
                  <span className="text-xs text-gray-600">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout: left content, right panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="col-span-1 lg:col-span-8 space-y-6">
          {/* Product Name & Slug */}
          <Card>
            <Section title="Product Information" icon={<Edit3 size={18} />}>
              {/* Product Name - Full Width */}
              <Field
                label="Product Name"
                required
                icon={<Tag size={14} />}
                help="A clear, descriptive name for your product"
              >
                <Input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Enter product name..."
                  onBlur={generateSlug}
                  className="w-full"
                />
              </Field>

              {/* Product Slug - Full Width */}
              <Field
                label="Product URL (Slug)"
                icon={<Globe size={14} />}
                help="Unique URL identifier for your product"
              >
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden w-full">
                  <span className="px-4 py-2.5 text-sm text-gray-500 bg-gray-100 border-r shrink-0">
                    yourstore.com/product/
                  </span>
                  <Input
                    name="slug"
                    value={form.slug}
                    onChange={onChange}
                    placeholder="unique-product-slug"
                    className="border-0 bg-transparent focus:ring-0 flex-1"
                  />
                </div>
              </Field>
            </Section>
          </Card>

          {/* Product Description */}
          <Card>
            <Section title="Description" icon={<Edit3 size={18} />}>
              <TiptapEditor
                content={form.description}
                onChange={onDescriptionChange}
              />
            </Section>
          </Card>

          {/* Product Data Tabs */}
          <Card>
            <div className="border-b border-gray-200">
              <div className="px-6 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Product Data
                      </h3>
                      <p className="text-sm text-gray-500">
                        Configure your product details and settings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Product Type
                      </label>
                      <Select
                        value={productType}
                        onChange={(e) => {
                          const next = e.target.value as "simple" | "variable";
                          setProductType(next);
                          if (next === "variable") setActiveTab("attributes");
                        }}
                        className="min-w-[160px]"
                      >
                        <option value="simple">Simple Product</option>
                        <option value="variable">Variable Product</option>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Tabs */}
              <nav className="px-6">
                <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                  {(
                    [
                      {
                        id: "general",
                        label: "General",
                        icon: <Settings size={16} />,
                      },
                      {
                        id: "inventory",
                        label: "Inventory",
                        icon: <Package size={16} />,
                      },
                      {
                        id: "shipping",
                        label: "Shipping",
                        icon: <Truck size={16} />,
                      },
                      {
                        id: "advanced",
                        label: "Advanced",
                        icon: <Zap size={16} />,
                      },
                      {
                        id: "attributes",
                        label: "Attributes",
                        icon: <Grid3X3 size={16} />,
                      },
                      {
                        id: "variations",
                        label: "Variations",
                        icon: <Layers size={16} />,
                      },
                    ] as const
                  ).map((tab) => {
                    const isHidden =
                      (tab.id === "attributes" || tab.id === "variations") &&
                      productType !== "variable";
                    const isActive = activeTab === tab.id;

                    if (isHidden) return null;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                          isActive
                            ? "border-blue-500 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>

            {/* Panels */}
            <div className="p-6">
              {activeTab === "general" && (
                <div className="space-y-8">
                  {/* Pricing Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Tag size={16} className="text-gray-600" />
                      Pricing
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Field
                        label="Regular Price"
                        required
                        icon={<ShoppingCart size={14} />}
                        help="The standard selling price"
                      >
                        <Input
                          name="regular_price"
                          value={form.regular_price}
                          onChange={onChange}
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                        />
                      </Field>
                      <Field
                        label="Sale Price"
                        help="Discounted price (optional)"
                      >
                        <Input
                          name="sale_price"
                          value={form.sale_price?.toString()}
                          onChange={onChange}
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                        />
                      </Field>
                      <Field label="Currency" required help="Product currency">
                        <Select
                          name="currency"
                          value={form.currency}
                          onChange={onChange}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="IDR">IDR (Rp)</option>
                        </Select>
                      </Field>
                    </div>
                  </div>

                  {/* Sale Schedule */}
                  {form.sale_price && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Star size={16} className="text-gray-600" />
                        Sale Schedule
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Sale Start Date"
                          help="When the sale price becomes active"
                        >
                          <Input
                            type="datetime-local"
                            name="sale_start_date"
                            value={form.sale_start_date}
                            onChange={onChange}
                          />
                        </Field>
                        <Field
                          label="Sale End Date"
                          help="When the sale price expires"
                        >
                          <Input
                            type="datetime-local"
                            name="sale_end_date"
                            value={form.sale_end_date}
                            onChange={onChange}
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="space-y-8">
                  {/* Stock Management */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package size={16} className="text-gray-600" />
                      Stock Management
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="SKU (Stock Keeping Unit)"
                        icon={<BarChart3 size={14} />}
                        help="Unique identifier for tracking inventory"
                      >
                        <Input
                          name="sku"
                          value={form.sku}
                          onChange={onChange}
                          placeholder="e.g., PROD-001-2024"
                        />
                      </Field>
                      <Field
                        label="Stock Quantity"
                        required
                        icon={<Package size={14} />}
                        help="Available quantity in inventory"
                      >
                        <Input
                          name="stock"
                          value={form.stock}
                          onChange={onChange}
                          placeholder="0"
                          type="number"
                          min="0"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Stock Status Indicator */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          Number(form.stock || 0) > 10
                            ? "bg-green-500"
                            : Number(form.stock || 0) > 0
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {Number(form.stock || 0) > 10
                            ? "In Stock"
                            : Number(form.stock || 0) > 0
                            ? "Low Stock"
                            : "Out of Stock"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Number(form.stock || 0)} units available
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-8">
                  {/* Physical Properties */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Truck size={16} className="text-gray-600" />
                      Shipping Information
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Weight"
                        icon={<Package size={14} />}
                        help="Product weight for shipping calculations (gram)"
                      >
                        <Input
                          name="weight"
                          value={form.weight}
                          onChange={onChange}
                          placeholder="0"
                          type="number"
                          step={1}
                          min="0"
                        />
                      </Field>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Shipping Calculator
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Weight is used to calculate shipping costs
                              automatically
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "advanced" && false && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Category">
                    <Select
                      name="category_id"
                      value={form.category_id}
                      onChange={onChange}
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Tax Class">
                    <Select
                      name="tax_class_id"
                      value={form.tax_class_id}
                      onChange={onChange}
                    >
                      <option value="">—</option>
                      {taxClasses.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (
                          {(Number(t.rate) * 100)
                            .toFixed(2)
                            .replace(/\.00$/, "")}
                          %)
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              {activeTab === "attributes" && productType === "variable" && (
                <div className="space-y-8">
                  {/* Attributes Selection */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Grid3X3 size={16} className="text-gray-600" />
                      Product Attributes
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">
                      Select attribute values to create product variations. Each
                      combination will become a separate variant.
                    </p>

                    {attributes.length > 0 ? (
                      <div className="space-y-6">
                        {attributes.map((attr) => (
                          <div
                            key={attr.id}
                            className="bg-gray-50 rounded-xl p-6"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                                <Tag className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-gray-900">
                                  {attr.name}
                                </h5>
                                <p className="text-xs text-gray-500">
                                  {(selections[attr.id] || []).length} of{" "}
                                  {attr.values.length} selected
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {attr.values.map((v) => {
                                const active = (
                                  selections[attr.id] || []
                                ).includes(v.id);
                                return (
                                  <button
                                    key={v.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleSelection(attr.id, v.id);
                                    }}
                                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                      active
                                        ? "border-blue-500 bg-blue-500 text-white shadow-md transform scale-105"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                  >
                                    {v.value}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">
                          No Attributes Found
                        </h5>
                        <p className="text-sm text-gray-500 mb-4">
                          Create attributes first to enable product variations
                        </p>
                        <Button variant="outline" size="sm">
                          <Plus size={16} />
                          Create Attribute
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Variation Preview */}
                  {cartesianPreview > 0 && (
                    <div className="bg-blue-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                          <Layers className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold text-blue-900">
                            Variation Preview
                          </h5>
                          <p className="text-xs text-blue-700">
                            {cartesianPreview} variation
                            {cartesianPreview > 1 ? "s" : ""} will be generated
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-blue-800">
                          Ready to generate {cartesianPreview} product variation
                          {cartesianPreview > 1 ? "s" : ""}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={generateVariantsInline}
                        >
                          <Zap size={16} />
                          Generate Variations
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Quick Add Custom Attribute */}
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900">
                          Quick Add Attribute
                        </h5>
                        <p className="text-xs text-gray-500">
                          Create a new attribute on the fly
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Attribute Name"
                          help="e.g., Color, Size, Material"
                        >
                          <Input
                            placeholder="Enter attribute name..."
                            id="qa_name"
                          />
                        </Field>
                        <Field
                          label="Values"
                          help="Comma separated values (e.g., Red, Blue, Green)"
                        >
                          <Input
                            placeholder="Enter values separated by commas..."
                            id="qa_values"
                          />
                        </Field>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            const name = (
                              document.getElementById(
                                "qa_name"
                              ) as HTMLInputElement
                            )?.value?.trim();
                            const values = (
                              document.getElementById(
                                "qa_values"
                              ) as HTMLInputElement
                            )?.value?.trim();
                            if (!name)
                              return toast.error("Please enter attribute name");

                            try {
                              await apiCallJson("/api/admin/attributes", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name,
                                  values: values
                                    ? values
                                        .split(",")
                                        .map((v) => v.trim())
                                        .filter(Boolean)
                                    : [],
                                }),
                              });

                              const data = await apiCallJson(
                                "/api/admin/attributes"
                              );
                              setAttributes(data.items || []);
                              (
                                document.getElementById(
                                  "qa_name"
                                ) as HTMLInputElement
                              ).value = "";
                              (
                                document.getElementById(
                                  "qa_values"
                                ) as HTMLInputElement
                              ).value = "";
                              toast.success("Attribute created successfully");
                            } catch (error) {
                              toast.error("Failed to create attribute");
                            }
                          }}
                        >
                          <Plus size={16} />
                          Create Attribute
                        </Button>
                        <span className="text-xs text-gray-500">
                          This attribute will be available for all products
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "variations" && productType === "variable" && (
                <div className="space-y-6">
                  {/* Variations Header */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Layers size={16} className="text-gray-600" />
                      Product Variations
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">
                      Manage individual variations of your product. Each
                      variation can have its own price, stock, and images.
                    </p>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Left side - Bulk actions */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleAllVariants}
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>

                          <Select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                            className="min-w-[160px]"
                          >
                            <option value="">Bulk Actions...</option>
                            <option value="delete_selected">
                              Delete Selected
                            </option>
                            <option value="set_regular_prices">
                              Set Regular Prices
                            </option>
                            <option value="increase_regular_prices">
                              Increase Prices (%)
                            </option>
                            <option value="decrease_regular_prices">
                              Decrease Prices (%)
                            </option>
                            <option value="set_sale_prices">
                              Set Sale Prices
                            </option>
                            <option value="set_stock_quantities">
                              Set Stock Quantities
                            </option>
                            <option value="set_weights">Set Weights (g)</option>
                            <option value="set_status">Set Status</option>
                          </Select>

                          {bulkAction === "set_status" && (
                            <Select
                              value={bulkValue}
                              onChange={(e) => setBulkValue(e.target.value)}
                            >
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                              <option value="private">Private</option>
                              <option value="archived">Archived</option>
                            </Select>
                          )}

                          {bulkAction &&
                            bulkAction !== "set_status" &&
                            (bulkAction.includes("increase") ||
                              bulkAction.includes("decrease")) && (
                              <Input
                                value={bulkPercent}
                                onChange={(e) => setBulkPercent(e.target.value)}
                                placeholder="%"
                                className="w-20"
                                type="number"
                              />
                            )}

                          {bulkAction &&
                            (bulkAction === "set_regular_prices" ||
                              bulkAction === "set_sale_prices" ||
                              bulkAction === "set_stock_quantities" ||
                              bulkAction === "set_weights") && (
                              <Input
                                value={bulkValue}
                                onChange={(e) => setBulkValue(e.target.value)}
                                placeholder={
                                  bulkAction === "set_weights"
                                    ? "Weight (g)"
                                    : bulkAction === "set_regular_prices"
                                    ? "Price"
                                    : bulkAction === "set_sale_prices"
                                    ? "Sale Price"
                                    : bulkAction === "set_stock_quantities"
                                    ? "Stock"
                                    : "Value"
                                }
                                className="w-32"
                                type="number"
                                step={
                                  bulkAction.includes("price") ? "0.01" : "1"
                                }
                              />
                            )}

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={applyBulkVariants}
                            disabled={
                              !productId ||
                              !bulkAction ||
                              selectedIds.size === 0
                            }
                          >
                            Apply to {selectedIds.size} item
                            {selectedIds.size !== 1 ? "s" : ""}
                          </Button>
                        </div>
                      </div>

                      {/* Right side - View controls */}
                      <div className="flex items-center flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportVariations}
                        >
                          <Download size={16} />
                          Export
                        </Button>
                        <label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                          >
                            <Upload size={16} />
                            Import
                          </Button>
                          <input
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) importVariationsFile(f);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <Button variant="ghost" size="sm" onClick={expandAll}>
                          Expand All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={collapseAll}>
                          Collapse All
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filter */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search variations by attributes, SKU..."
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="sm:w-48"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="private">Private</option>
                      <option value="archived">Archived</option>
                    </Select>
                  </div>

                  {/* Variations List */}
                  {filteredVariants.length > 0 ? (
                    <div className="space-y-4">
                      {/* Desktop Table View */}
                      <div className="hidden lg:block w-full overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-4 text-left">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={toggleAllVariants}
                                  className="rounded border-gray-300"
                                />
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Variation Details
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Pricing
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Stock
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Weight
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredVariants.map((v) => (
                              <React.Fragment key={v.id}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(v.id)}
                                      onChange={() => toggleOneVariant(v.id)}
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      {v.image_url ? (
                                        <img
                                          src={v.image_url}
                                          alt="Variation"
                                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                          <ImageIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {(v.attributes || [])
                                            .map((a) => a.value)
                                            .join(" • ") || "No attributes"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          SKU: {v.sku || "Not set"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          ID: #{v.id.slice(0, 8)}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {priceFormatter.format(
                                          Number(v.regular_price || 0)
                                        )}
                                      </p>
                                      {v.sale_price && (
                                        <p className="text-xs text-green-600">
                                          Sale:{" "}
                                          {priceFormatter.format(
                                            Number(v.sale_price)
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-3 h-3 rounded-full ${
                                          v.stock > 10
                                            ? "bg-green-500"
                                            : v.stock > 0
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                        }`}
                                      />
                                      <span className="text-sm text-gray-900">
                                        {v.stock}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-gray-900">
                                        {v.weight || 0}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        g
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        v.status === "published"
                                          ? "bg-green-100 text-green-800"
                                          : v.status === "draft"
                                          ? "bg-gray-100 text-gray-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {v.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleExpand(v.id)}
                                      >
                                        {expandedIds.has(v.id) ? (
                                          <ChevronDown size={16} />
                                        ) : (
                                          <ChevronRight size={16} />
                                        )}
                                      </Button>
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => saveVariantRow(v)}
                                      >
                                        <Save size={16} />
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => deleteVariantRow(v.id)}
                                      >
                                        <Trash2 size={16} />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedIds.has(v.id) && (
                                  <tr>
                                    <td colSpan={7} className="px-0 py-0">
                                      <div className="m-0 p-4 md:p-5 space-y-6 bg-white rounded-none md:rounded-lg border-t border-gray-200 md:border md:shadow-sm w-full">
                                        {/* Variant Image Section */}
                                        <div className="bg-white">
                                          <div>
                                            <h6 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                              <ImageIcon size={16} />
                                              Variant Image
                                            </h6>
                                            {v.image_url ? (
                                              <div className="relative group inline-block">
                                                <img
                                                  src={v.image_url}
                                                  alt={`Variant ${v.id} image`}
                                                  className="w-24 h-24 md:w-28 md:h-28 rounded-lg object-cover border border-gray-200"
                                                />
                                                <button
                                                  className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center shadow focus:outline-none"
                                                  onClick={async () => {
                                                    try {
                                                      await apiCallJson(
                                                        `/api/admin/products/${productId}/variants/${v.id}/media`,
                                                        { method: "DELETE" }
                                                      );
                                                      await loadVariants();
                                                    } catch (error) {
                                                      // Error already handled by useAuthenticatedFetch interceptor
                                                      console.error(
                                                        "Failed to delete variant image:",
                                                        error
                                                      );
                                                    }
                                                  }}
                                                  title="Remove variant image"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                className="w-24 h-24 md:w-28 md:h-28 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition flex flex-col items-center justify-center gap-1"
                                                onClick={() =>
                                                  openVariantImagePicker(v.id)
                                                }
                                              >
                                                <ImageIcon className="w-7 h-7 text-gray-400" />
                                                <span className="text-[11px] text-gray-500 font-medium">
                                                  Add Image
                                                </span>
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Basic Information Section */}
                                        <div className="bg-white">
                                          <h6 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <Tag size={16} />
                                            Basic Information
                                          </h6>
                                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                            <Field
                                              label="SKU"
                                              help="Unique identifier"
                                            >
                                              <Input
                                                value={v.sku || ""}
                                                onChange={(e) =>
                                                  setVariants((arr) =>
                                                    arr.map((x) =>
                                                      x.id === v.id
                                                        ? {
                                                            ...x,
                                                            sku: e.target.value,
                                                          }
                                                        : x
                                                    )
                                                  )
                                                }
                                                onBlur={(e) =>
                                                  saveVariantRow({
                                                    ...v,
                                                    sku: e.target.value,
                                                  } as VariantRow)
                                                }
                                                placeholder="e.g., SHIRT-BLU-XL"
                                              />
                                            </Field>
                                            <Field
                                              label="Weight (g)"
                                              help="Product weight for shipping"
                                            >
                                              <Input
                                                value={v.weight ?? ""}
                                                onChange={(e) =>
                                                  setVariants((arr) =>
                                                    arr.map((x) =>
                                                      x.id === v.id
                                                        ? {
                                                            ...x,
                                                            weight:
                                                              e.target.value ===
                                                              ""
                                                                ? null
                                                                : Math.max(
                                                                    0,
                                                                    Math.floor(
                                                                      Number(
                                                                        e.target
                                                                          .value
                                                                      )
                                                                    )
                                                                  ),
                                                          }
                                                        : x
                                                    )
                                                  )
                                                }
                                                onBlur={(e) =>
                                                  saveVariantRow({
                                                    ...v,
                                                    weight:
                                                      e.target.value === ""
                                                        ? null
                                                        : Math.max(
                                                            0,
                                                            Math.floor(
                                                              Number(
                                                                e.target.value
                                                              )
                                                            )
                                                          ),
                                                  } as VariantRow)
                                                }
                                                type="number"
                                                step={1}
                                                min="0"
                                                placeholder="500"
                                              />
                                            </Field>
                                          </div>
                                        </div>

                                        {/* Pricing Section */}
                                        <div className="bg-white">
                                          <h6 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <DollarSign size={16} />
                                            Pricing
                                          </h6>
                                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                            <Field
                                              label="Regular Price"
                                              help="Standard selling price"
                                            >
                                              <Input
                                                value={v.regular_price ?? ""}
                                                onChange={(e) =>
                                                  setVariants((arr) =>
                                                    arr.map((x) =>
                                                      x.id === v.id
                                                        ? {
                                                            ...x,
                                                            regular_price:
                                                              e.target.value ===
                                                              ""
                                                                ? null
                                                                : Number(
                                                                    e.target
                                                                      .value
                                                                  ),
                                                          }
                                                        : x
                                                    )
                                                  )
                                                }
                                                onBlur={(e) =>
                                                  saveVariantRow({
                                                    ...v,
                                                    regular_price:
                                                      e.target.value === ""
                                                        ? null
                                                        : Number(
                                                            e.target.value
                                                          ),
                                                  } as VariantRow)
                                                }
                                                type="number"
                                                step="0.01"
                                              />
                                            </Field>

                                            <Field
                                              label="Sale Price"
                                              help="Discounted price (optional)"
                                            >
                                              <Input
                                                value={v.sale_price ?? ""}
                                                onChange={(e) =>
                                                  setVariants((arr) =>
                                                    arr.map((x) =>
                                                      x.id === v.id
                                                        ? {
                                                            ...x,
                                                            sale_price:
                                                              e.target.value ===
                                                              ""
                                                                ? null
                                                                : Number(
                                                                    e.target
                                                                      .value
                                                                  ),
                                                          }
                                                        : x
                                                    )
                                                  )
                                                }
                                                onBlur={(e) =>
                                                  saveVariantRow({
                                                    ...v,
                                                    sale_price:
                                                      e.target.value === ""
                                                        ? null
                                                        : Number(
                                                            e.target.value
                                                          ),
                                                  } as VariantRow)
                                                }
                                                type="number"
                                                step="0.01"
                                              />
                                            </Field>
                                          </div>
                                        </div>

                                        {/* Inventory Section */}
                                        <div className="bg-white">
                                          <h6 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <Package size={16} />
                                            Inventory
                                          </h6>
                                          <div className="grid gap-4 grid-cols-1">
                                            <Field
                                              label="Stock Quantity"
                                              help="Available inventory"
                                            >
                                              <Input
                                                value={v.stock}
                                                onChange={(e) =>
                                                  setVariants((arr) =>
                                                    arr.map((x) =>
                                                      x.id === v.id
                                                        ? {
                                                            ...x,
                                                            stock:
                                                              Number(
                                                                e.target.value
                                                              ) || 0,
                                                          }
                                                        : x
                                                    )
                                                  )
                                                }
                                                onBlur={(e) =>
                                                  saveVariantRow({
                                                    ...v,
                                                    stock:
                                                      Number(e.target.value) ||
                                                      0,
                                                  } as VariantRow)
                                                }
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                className="max-w-xs"
                                              />
                                            </Field>
                                          </div>
                                        </div>

                                        {/* Sale Schedule Section */}
                                        {v.sale_price && (
                                          <div className="bg-white">
                                            <h6 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2 pb-2 border-b border-gray-200">
                                              <Calendar size={16} />
                                              Sale Schedule
                                            </h6>
                                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                              <Field
                                                label="Sale Start Date"
                                                help="When the sale price becomes active"
                                              >
                                                <Input
                                                  type="datetime-local"
                                                  defaultValue={
                                                    v.sale_start_date
                                                      ? toLocalDateTime(
                                                          v.sale_start_date
                                                        )
                                                      : ""
                                                  }
                                                  onBlur={(e) =>
                                                    saveVariantRow({
                                                      ...v,
                                                      sale_start_date:
                                                        e.target.value,
                                                    } as VariantRow)
                                                  }
                                                />
                                              </Field>
                                              <Field
                                                label="Sale End Date"
                                                help="When the sale price expires"
                                              >
                                                <Input
                                                  type="datetime-local"
                                                  defaultValue={
                                                    v.sale_end_date
                                                      ? toLocalDateTime(
                                                          v.sale_end_date
                                                        )
                                                      : ""
                                                  }
                                                  onBlur={(e) =>
                                                    saveVariantRow({
                                                      ...v,
                                                      sale_end_date:
                                                        e.target.value,
                                                    } as VariantRow)
                                                  }
                                                />
                                              </Field>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="block lg:hidden space-y-4">
                        {filteredVariants.map((v) => (
                          <div
                            key={v.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                          >
                            {/* Card Header */}
                            <div className="p-4 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(v.id)}
                                    onChange={() => toggleOneVariant(v.id)}
                                    className="rounded border-gray-300"
                                  />
                                  {v.image_url ? (
                                    <img
                                      src={v.image_url}
                                      alt="Variation"
                                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <ImageIcon className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {(v.attributes || [])
                                        .map((a) => a.value)
                                        .join(" • ") || "No attributes"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      #{v.id.slice(0, 8)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(v.id)}
                                >
                                  {expandedIds.has(v.id) ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRight size={16} />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Price:</span>
                                  <p className="font-medium">
                                    {priceFormatter.format(
                                      Number(v.regular_price || 0)
                                    )}
                                  </p>
                                  {v.sale_price && (
                                    <p className="text-xs text-green-600">
                                      Sale:{" "}
                                      {priceFormatter.format(
                                        Number(v.sale_price)
                                      )}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500">Stock:</span>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        v.stock > 10
                                          ? "bg-green-500"
                                          : v.stock > 0
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                      }`}
                                    />
                                    <span className="font-medium">
                                      {v.stock}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Weight:</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-900">
                                      {v.weight || 0}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      g
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">SKU:</span>
                                  <p className="font-mono text-xs">
                                    {v.sku || "Not set"}
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-500">Status:</span>
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      v.status === "published"
                                        ? "bg-green-100 text-green-800"
                                        : v.status === "draft"
                                        ? "bg-gray-100 text-gray-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {v.status}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => saveVariantRow(v)}
                                  className="flex-1"
                                >
                                  <Save size={16} />
                                  Save
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => deleteVariantRow(v.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedIds.has(v.id) && (
                              <div className="border-t border-gray-100 p-4 bg-gray-50">
                                <div className="space-y-4">
                                  <Field label="SKU">
                                    <Input
                                      value={v.sku || ""}
                                      onChange={(e) =>
                                        setVariants((arr) =>
                                          arr.map((x) =>
                                            x.id === v.id
                                              ? { ...x, sku: e.target.value }
                                              : x
                                          )
                                        )
                                      }
                                      onBlur={(e) =>
                                        saveVariantRow({
                                          ...v,
                                          sku: e.target.value,
                                        } as VariantRow)
                                      }
                                    />
                                  </Field>

                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <Field label="Regular Price">
                                      <Input
                                        value={v.regular_price ?? ""}
                                        onChange={(e) =>
                                          setVariants((arr) =>
                                            arr.map((x) =>
                                              x.id === v.id
                                                ? {
                                                    ...x,
                                                    regular_price:
                                                      e.target.value === ""
                                                        ? null
                                                        : Number(
                                                            e.target.value
                                                          ),
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveVariantRow({
                                            ...v,
                                            regular_price:
                                              e.target.value === ""
                                                ? null
                                                : Number(e.target.value),
                                          } as VariantRow)
                                        }
                                        type="number"
                                        step="0.01"
                                      />
                                    </Field>

                                    <Field label="Stock">
                                      <Input
                                        value={v.stock}
                                        onChange={(e) =>
                                          setVariants((arr) =>
                                            arr.map((x) =>
                                              x.id === v.id
                                                ? {
                                                    ...x,
                                                    stock:
                                                      Number(e.target.value) ||
                                                      0,
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveVariantRow({
                                            ...v,
                                            stock: Number(e.target.value) || 0,
                                          } as VariantRow)
                                        }
                                        type="number"
                                        min="0"
                                      />
                                    </Field>

                                    <Field label="Weight (g)">
                                      <Input
                                        value={v.weight ?? ""}
                                        onChange={(e) =>
                                          setVariants((arr) =>
                                            arr.map((x) =>
                                              x.id === v.id
                                                ? {
                                                    ...x,
                                                    weight:
                                                      e.target.value === ""
                                                        ? null
                                                        : Math.max(
                                                            0,
                                                            Math.floor(
                                                              Number(
                                                                e.target.value
                                                              )
                                                            )
                                                          ),
                                                  }
                                                : x
                                            )
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveVariantRow({
                                            ...v,
                                            weight:
                                              e.target.value === ""
                                                ? null
                                                : Math.max(
                                                    0,
                                                    Math.floor(
                                                      Number(e.target.value)
                                                    )
                                                  ),
                                          } as VariantRow)
                                        }
                                        type="number"
                                        step={1}
                                        min="0"
                                      />
                                    </Field>
                                  </div>

                                  {v.sale_price && (
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                      <Field
                                        label="Sale Start Date"
                                        help="When the sale price becomes active"
                                      >
                                        <Input
                                          type="datetime-local"
                                          defaultValue={
                                            v.sale_start_date
                                              ? toLocalDateTime(
                                                  v.sale_start_date
                                                )
                                              : ""
                                          }
                                          onBlur={(e) =>
                                            saveVariantRow({
                                              ...v,
                                              sale_start_date: e.target.value,
                                            } as VariantRow)
                                          }
                                        />
                                      </Field>
                                      <Field
                                        label="Sale End Date"
                                        help="When the sale price expires"
                                      >
                                        <Input
                                          type="datetime-local"
                                          defaultValue={
                                            v.sale_end_date
                                              ? toLocalDateTime(v.sale_end_date)
                                              : ""
                                          }
                                          onBlur={(e) =>
                                            saveVariantRow({
                                              ...v,
                                              sale_end_date: e.target.value,
                                            } as VariantRow)
                                          }
                                        />
                                      </Field>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">
                        No Variations
                      </h5>
                      <p className="text-sm text-gray-500 mb-4">
                        Create attributes and generate variations to get started
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("attributes")}
                      >
                        <Grid3X3 size={16} />
                        Setup Attributes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          {/* Status & Visibility */}
          <Card>
            <Section title="Status & Visibility" icon={<Eye size={18} />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Visibility
                    </p>
                    <p className="text-xs text-gray-500">
                      Control who can see this product
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      form.status === "published"
                        ? "bg-green-100 text-green-700"
                        : form.status === "draft"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {form.status === "published" && (
                      <Globe className="w-3 h-3 inline mr-1" />
                    )}
                    {form.status === "draft" && (
                      <Edit3 className="w-3 h-3 inline mr-1" />
                    )}
                    {form.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={form.status === "published"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.checked ? "published" : f.status,
                        }))
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Published
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Visible to everyone
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={form.status === "draft"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.checked ? "draft" : f.status,
                        }))
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Draft
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Only visible to admins
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </Section>
          </Card>

          {/* Category & Tax */}
          <Card>
            <Section title="Organization" icon={<Tag size={18} />}>
              <div className="space-y-4">
                <Field
                  label="Product Category"
                  icon={<Grid3X3 size={14} />}
                  help="Choose the best category for your product"
                >
                  <Select
                    name="category_id"
                    value={form.category_id}
                    onChange={onChange}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Tax Class"
                  icon={<BarChart3 size={14} />}
                  help="Tax rate applied to this product"
                >
                  <Select
                    name="tax_class_id"
                    value={form.tax_class_id}
                    onChange={onChange}
                  >
                    <option value="">No tax class</option>
                    {taxClasses.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (
                        {(Number(t.rate) * 100).toFixed(2).replace(/\.00$/, "")}
                        %)
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Quick Category Info */}
                {form.category_id && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Category Set
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      This will help customers find your product more easily
                    </p>
                  </div>
                )}
              </div>
            </Section>
          </Card>

          {/* Product Images */}
          <Card>
            <Section title="Product Images" icon={<ImageIcon size={18} />}>
              <div className="space-y-6">
                {/* Featured Image */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        Featured Image
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openFeaturedImagePicker}
                    >
                      {images[0] ? (
                        <>
                          <Edit3 size={16} />
                          Change
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add Featured
                        </>
                      )}
                    </Button>
                  </div>

                  {images[0] ? (
                    <div className="relative group">
                      <img
                        src={images[0].file_url}
                        alt={images[0].alt_text || "Featured image"}
                        className="w-full aspect-square rounded-xl object-cover border border-gray-200 bg-gray-50"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={openFeaturedImagePicker}
                          >
                            <Edit3 size={16} />
                            Change
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              removeProductImage(images[0].media_id)
                            }
                          >
                            <Trash2 size={16} />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* Featured Badge */}
                      <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Featured
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                      onClick={openFeaturedImagePicker}
                    >
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h5 className="text-sm font-medium text-gray-900 mb-1">
                          Add Featured Image
                        </h5>
                        <p className="text-xs text-gray-500 mb-3">
                          The main image for your product
                        </p>
                        <Button variant="outline" size="sm">
                          <Plus size={16} />
                          Upload Image
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Featured Image Tips
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Use high-quality images (800x800px or larger). Square
                          format works best for product listings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-gray-600" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        Gallery Images
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openGalleryPicker}
                    >
                      <Plus size={16} />
                      Add Images
                    </Button>
                  </div>

                  {images.length > 1 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {images.slice(1).map((img, index) => (
                          <div
                            key={img.media_id}
                            className="relative group aspect-square"
                          >
                            {img.file_url ? (
                              <img
                                src={img.file_url}
                                alt={
                                  img.alt_text || `Gallery image ${index + 1}`
                                }
                                className="w-full h-full rounded-lg object-cover border border-gray-200 bg-gray-50"
                                onError={(e) => {
                                  console.error(
                                    "Failed to load gallery image:",
                                    img.file_url
                                  );
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget
                                    .nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}

                            {/* Fallback for broken images */}
                            <div
                              className="w-full h-full rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xs hidden"
                              style={{
                                display: img.file_url ? "none" : "flex",
                              }}
                            >
                              <div className="text-center">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                                <div className="text-xs">Error</div>
                              </div>
                            </div>

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <div className="flex items-center gap-2">
                                <button
                                  className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-yellow-600 transition-colors"
                                  onClick={() => setAsFeatured(img.media_id)}
                                  title="Set as featured"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                                <button
                                  className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                  onClick={() =>
                                    removeProductImage(img.media_id)
                                  }
                                  title="Remove image"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openGalleryPicker}
                        >
                          <Plus size={16} />
                          Add More Images
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                      onClick={openGalleryPicker}
                    >
                      <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h5 className="text-sm font-medium text-gray-900 mb-1">
                        Add Gallery Images
                      </h5>
                      <p className="text-xs text-gray-500 mb-4">
                        Show multiple angles and details
                      </p>
                      <Button variant="outline" size="sm">
                        <Plus size={16} />
                        Upload Images
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </Card>

          {showMediaPicker && (
            <MediaPicker
              mode={mediaPickerMode}
              mediaType={mediaPickerType}
              selectedMedia={[]}
              onSelect={handleMediaSelect}
              onClose={() => setShowMediaPicker(false)}
              autoCreateFolder={
                currentPickerTarget === "variant"
                  ? "products/variants"
                  : currentPickerTarget === "gallery"
                  ? "products/gallery"
                  : "products"
              }
              productSlug={form.slug}
            />
          )}
        </div>
      </div>
    </div>
  );
}

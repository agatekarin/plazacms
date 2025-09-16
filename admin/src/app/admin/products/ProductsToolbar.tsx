"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import ProductImportModal from "./ProductImportModal";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  RefreshCw,
  X,
  ChevronDown,
} from "lucide-react";

interface ProductsToolbarProps {
  total: number;
}

export default function ProductsToolbar({ total }: ProductsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Enhanced API Helper with global error handling
  const { apiCall } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`ProductsToolbar API Error on ${url}:`, error);
      toast.error(error?.message || "Export failed");
    },
  });

  const q = sp.get("q") || "";
  const filter = sp.get("filter") || "all";
  const sort = sp.get("sort") || "created_desc";
  const category = sp.get("category") || "";
  const status = sp.get("status") || "";

  const setParam = useCallback(
    (key: string, value?: string) => {
      const next = new URLSearchParams(sp.toString());
      if (value && value.length) next.set(key, value);
      else next.delete(key);
      // reset page when filter/search changes
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, sp]
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    router.push(`${pathname}?${next.toString()}`);
  }, [router, pathname]);

  const tabs = useMemo(
    () =>
      [
        { key: "all", label: "All", count: total, color: "default" },
        { key: "published", label: "Published", count: 0, color: "success" },
        { key: "draft", label: "Draft", count: 0, color: "warning" },
        { key: "on_sale", label: "On Sale", count: 0, color: "secondary" }, // Changed from primary to secondary
        {
          key: "out_of_stock",
          label: "Out of Stock",
          count: 0,
          color: "danger",
        },
      ] as {
        key: string;
        label: string;
        count: number;
        color: "default" | "success" | "warning" | "secondary" | "danger";
      }[],
    [total]
  );

  const sortOptions = [
    { value: "created_desc", label: "Newest First" },
    { value: "created_asc", label: "Oldest First" },
    { value: "name_asc", label: "Name A-Z" },
    { value: "name_desc", label: "Name Z-A" },
    { value: "price_asc", label: "Price Low to High" },
    { value: "price_desc", label: "Price High to Low" },
    { value: "stock_asc", label: "Stock Low to High" },
    { value: "stock_desc", label: "Stock High to Low" },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
    { value: "archived", label: "Archived" },
  ];

  const activeFiltersCount = [q, category, status].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            {/* Left Side - Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  defaultValue={q}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value;
                      setParam("q", v || undefined);
                    }
                  }}
                  leftIcon={<Search className="h-4 w-4" />}
                  className="pr-20"
                />
                {q && (
                  <button
                    onClick={() => setParam("q", undefined)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="primary"
                      className="ml-1 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      showAdvancedFilters ? "rotate-180" : ""
                    }`}
                  />
                </Button>

                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Right Side - Actions & View */}
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="flex items-center gap-1">
                <Select
                  value={sort}
                  onChange={(e) => setParam("sort", e.target.value)}
                  options={sortOptions}
                  className="min-w-[140px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="p-2"
                  title={
                    sort.includes("_desc")
                      ? "Sort Descending"
                      : "Sort Ascending"
                  }
                >
                  {sort.includes("_desc") ? (
                    <SortDesc className="h-4 w-4" />
                  ) : (
                    <SortAsc className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.refresh()}
                  className="p-2"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="p-2"
                  title="Import CSV"
                  onClick={() => setShowImport(true)}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const params = new URLSearchParams();
                      if (q) params.set("q", q);
                      if (filter !== "all") params.set("filter", filter);
                      if (sort !== "created_desc") params.set("sort", sort);
                      if (category) params.set("category", category);
                      if (status) params.set("status", status);

                      const response = await apiCall(
                        `/api/admin/products/export?${params.toString()}`
                      );

                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = blobUrl;
                      a.download = `products-${
                        new Date().toISOString().split("T")[0]
                      }.csv`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(blobUrl);
                      document.body.removeChild(a);
                      toast.success("Products exported successfully");
                    } catch (error) {
                      toast.error("Failed to export products");
                    }
                  }}
                  className="p-2"
                  title="Export Products"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-3 bg-gray-50/50">
          <div className="flex p-2 items-center gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <Button
                key={t.key}
                variant={filter === t.key ? "primary" : "ghost"}
                size="sm"
                onClick={() =>
                  setParam("filter", t.key === "all" ? undefined : t.key)
                }
                className="whitespace-nowrap flex items-center gap-2"
              >
                {t.label}
                <Badge
                  variant={filter === t.key ? "outline" : t.color}
                  className="text-xs"
                >
                  {t.key === "all" ? total : t.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select
                  value={category}
                  onChange={(e) =>
                    setParam("category", e.target.value || undefined)
                  }
                  options={[
                    { value: "", label: "All Categories" },
                    { value: "electronics", label: "Electronics" },
                    { value: "clothing", label: "Clothing" },
                    { value: "books", label: "Books" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={status}
                  onChange={(e) =>
                    setParam("status", e.target.value || undefined)
                  }
                  options={statusOptions}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Min" type="number" className="flex-1" />
                  <span className="text-gray-400">-</span>
                  <Input placeholder="Max" type="number" className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(q || category || status) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Active filters:</span>
          {q && (
            <Badge variant="outline" className="flex items-center gap-1">
              Search: `{q}`
              <button
                onClick={() => setParam("q", undefined)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {category && (
            <Badge variant="outline" className="flex items-center gap-1">
              Category: {category}
              <button
                onClick={() => setParam("category", undefined)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {status && (
            <Badge variant="outline" className="flex items-center gap-1">
              Status: {status}
              <button
                onClick={() => setParam("status", undefined)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
      <ProductImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => router.refresh()}
      />
    </div>
  );
}

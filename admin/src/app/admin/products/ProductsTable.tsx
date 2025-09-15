"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, StockBadge } from "@/components/ui/badge";
import { Trash2, CheckSquare, Square } from "lucide-react";
import ProductActions from "./ProductActions";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  status: string;
  stock: number;
  regular_price: number;
  currency: string;
  created_at: string;
  category_name?: string;
  featured_image_url?: string;
  featured_image_filename?: string;
}

interface ProductsTableProps {
  products: Product[];
  categories: { id: string; name: string }[]; // Redefined CategoryOption
  taxClasses: { id: string; name: string; rate: string }[]; // Redefined TaxClassOption
  loading?: boolean;
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm ${className}`}>
      {children}
    </td>
  );
}

export default function ProductsTable({
  products,
  categories,
  taxClasses,
  loading = false,
}: ProductsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `Delete ${selectedIds.size} selected products? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin/products/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete products");
      }

      setSelectedIds(new Set());
      toast.success(
        `${selectedIds.size} product${
          selectedIds.size > 1 ? "s" : ""
        } deleted successfully`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete products"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Skeleton row component
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <Td>
        <div className="h-4 w-4 bg-gray-200 rounded"></div>
      </Td>
      <Td>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-100 rounded w-24"></div>
          </div>
        </div>
      </Td>
      <Td><div className="h-4 bg-gray-200 rounded w-20"></div></Td>
      <Td><div className="h-6 bg-gray-200 rounded-full w-20"></div></Td>
      <Td><div className="h-6 bg-gray-200 rounded-full w-16"></div></Td>
      <Td><div className="h-4 bg-gray-200 rounded w-16"></div></Td>
      <Td><div className="h-4 bg-gray-200 rounded w-24"></div></Td>
      <Td><div className="h-4 bg-gray-200 rounded w-20"></div></Td>
      <Td>
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
        </div>
      </Td>
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <Th className="w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {selectedIds.size === products.length &&
                    products.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </Th>
                <Th className="w-64">Product</Th>
                <Th>SKU</Th>
                <Th>Status</Th>
                <Th>Stock</Th>
                <Th>Price</Th>
                <Th>Category</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // Show skeleton loaders when loading
                Array(5).fill(0).map((_, i) => <SkeletonRow key={`skeleton-${i}`} />)
              ) : products.length === 0 ? (
                // Show empty state when no products
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        📦
                      </div>
                      <p className="text-sm font-medium">No products found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Create your first product to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p: Product) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <Td>
                      <button
                        onClick={() => toggleSelect(p.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {selectedIds.has(p.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center space-x-3">
                        {p.featured_image_url ? (
                          <img
                            src={p.featured_image_url}
                            alt={p.featured_image_filename || p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {p.slug}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-mono text-sm text-gray-600">
                        {p.sku || <span className="text-gray-400">—</span>}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                    <Td>
                      <StockBadge stock={p.stock} />
                    </Td>
                    <Td>
                      <div className="font-semibold text-gray-900">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: p.currency || "USD",
                        }).format(p.regular_price || 0)}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-gray-600">
                        {p.category_name || (
                          <span className="text-gray-400">Uncategorized</span>
                        )}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-gray-600">
                        {new Date(p.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </Td>
                    <Td>
                      <ProductActions product={p} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

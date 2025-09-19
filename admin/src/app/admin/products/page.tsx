"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import ProductsToolbar from "./ProductsToolbar";
import ProductsHeader from "./ProductsHeader";
import ProductsTable from "./ProductsTable";
import { useSession } from "@hono/auth-js/react";
import toast from "react-hot-toast";

type ProductRow = {
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
  review_count?: number;
  average_rating?: number;
};

export default function ProductsPage() {
  const sp = useSearchParams();
  const { data: session } = useSession();
  const q = sp.get("q") || "";
  const filter = sp.get("filter") || "all";
  const sort = sp.get("sort") || "created_desc";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(sp.get("pageSize") || "20", 10))
  );

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [taxClasses, setTaxClasses] = useState<
    { id: string; name: string; rate: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`ProductsPage API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load data");
    },
  });

  // Refresh function to trigger data reload
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        const params = new URLSearchParams({
          q,
          filter,
          sort,
          page: String(page),
          pageSize: String(pageSize),
        });

        const [productsData, categoriesData, taxClassesData] =
          await Promise.all([
            apiCallJson(`/api/admin/products?${params.toString()}`, {
              cache: "no-store",
            }),
            apiCallJson("/api/admin/categories", { cache: "no-store" }),
            apiCallJson("/api/admin/tax-classes?active=true", {
              cache: "no-store",
            }),
          ]);

        if (cancelled) return;

        const items = Array.isArray(productsData.items)
          ? (productsData.items as ProductRow[])
          : [];
        // Normalize nulls to undefined for UI types
        setRows(
          items.map((r) => ({
            ...r,
            sku: r.sku || undefined,
            category_name: r.category_name || undefined,
            featured_image_url: r.featured_image_url || undefined,
            featured_image_filename: r.featured_image_filename || undefined,
          }))
        );
        setTotal(
          typeof productsData.total === "number" ? productsData.total : 0
        );
        setCategories(
          Array.isArray(categoriesData.items) ? categoriesData.items : []
        );
        setTaxClasses(
          Array.isArray(taxClassesData.items) ? taxClassesData.items : []
        );
      } catch (error) {
        // Error already handled by useAuthenticatedFetch interceptor
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          setCategories([]);
          setTaxClasses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [q, filter, sort, page, pageSize, refreshTrigger]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / pageSize)),
    [total, pageSize]
  );

  return (
    <div className="space-y-6">
      <ProductsHeader />

      {loading && (
        <div className="text-xs text-gray-500 px-1">Loading products...</div>
      )}

      <ProductsToolbar total={total} onRefresh={handleRefresh} />

      <ProductsTable
        products={rows}
        categories={categories}
        taxClasses={taxClasses}
        loading={loading}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {Math.min((page - 1) * pageSize + 1, total)} to{" "}
          {Math.min(page * pageSize, total)} of {total} results
        </div>
        <div className="flex items-center space-x-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}`}
              className={`px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${
                loading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              Previous
            </Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, page - 2) + i;
            if (pageNum > totalPages) return null;
            return (
              <Link
                key={pageNum}
                href={`?page=${pageNum}`}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pageNum === page
                    ? "text-blue-600 bg-blue-50 border border-blue-300"
                    : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                } ${loading ? "pointer-events-none opacity-60" : ""}`}
              >
                {pageNum}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}`}
              className={`px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${
                loading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

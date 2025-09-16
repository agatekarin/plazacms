"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import ProductEditor from "../ProductEditor";
import toast from "react-hot-toast";

export default function AddProductPage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [taxClasses, setTaxClasses] = useState<
    { id: string; name: string; rate: string }[]
  >([]);

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`AddProductPage API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load data");
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [categoriesData, taxClassesData] = await Promise.all([
          apiCallJson("/api/admin/categories", { cache: "no-store" }),
          apiCallJson("/api/admin/tax-classes?active=true", {
            cache: "no-store",
          }),
        ]);

        if (cancelled) return;
        setCategories(
          Array.isArray(categoriesData.items) ? categoriesData.items : []
        );
        setTaxClasses(
          Array.isArray(taxClassesData.items) ? taxClassesData.items : []
        );
      } catch (error) {
        // Error already handled by useAuthenticatedFetch interceptor
        if (!cancelled) {
          setCategories([]);
          setTaxClasses([]);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add Product</h1>
      </div>
      <ProductEditor
        mode="create"
        categories={categories}
        taxClasses={taxClasses}
      />
    </div>
  );
}

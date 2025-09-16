"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import ProductEditor, { Product } from "../../ProductEditor";
import toast from "react-hot-toast";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const initialTab = (sp.get("tab") || undefined) as any;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [taxClasses, setTaxClasses] = useState<
    { id: string; name: string; rate: string }[]
  >([]);

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`EditProductPage API Error on ${url}:`, error);
      if (error.status === 404) {
        toast.error("Product not found");
        router.push("/admin/products");
      } else {
        toast.error(error?.message || "Failed to load data");
      }
    },
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadData = async () => {
      try {
        const [productData, categoriesData, taxClassesData] = await Promise.all(
          [
            apiCallJson(`/api/admin/products/${id}`, { cache: "no-store" }),
            apiCallJson("/api/admin/categories", { cache: "no-store" }),
            apiCallJson("/api/admin/tax-classes?active=true", {
              cache: "no-store",
            }),
          ]
        );

        if (cancelled) return;
        if (productData?.item) setProduct(productData.item as Product);
        setCategories(
          Array.isArray(categoriesData.items) ? categoriesData.items : []
        );
        setTaxClasses(
          Array.isArray(taxClassesData.items) ? taxClassesData.items : []
        );
      } catch (error) {
        // Error already handled by useAuthenticatedFetch interceptor
        if (!cancelled && (error as any)?.status !== 404) {
          // 404 is handled in onError, other errors redirect to products list
          router.push("/admin/products");
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Product</h1>
      </div>
      <ProductEditor
        mode="edit"
        categories={categories}
        taxClasses={taxClasses}
        initialProduct={product || undefined}
        initialTab={initialTab}
      />
    </div>
  );
}

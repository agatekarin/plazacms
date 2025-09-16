"use client";

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
  featured_image_url?: string; // Added this for usage in ProductsTable.tsx
  featured_image_filename?: string; // Added this for usage in ProductsTable.tsx
}

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`ProductActions API Error on ${url}:`, error);
      toast.error(error?.message || "API request failed");
    },
  });

  function onEdit() {
    router.push(`/admin/products/${product.id}/edit`);
  }

  function onVariants() {
    router.push(`/admin/products/${product.id}/edit?tab=variations`);
  }

  function onDelete() {
    if (!confirm("Delete this product?")) return;
    startTransition(async () => {
      try {
        await apiCallJson(`/api/admin/products/${product.id}`, {
          method: "DELETE",
        });
        toast.success("Product deleted successfully");
        router.refresh();
      } catch (error) {
        // Error already handled by useAuthenticatedFetch interceptor
        console.error("Failed to delete product:", error);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="p-2"
        aria-label="Edit product"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onVariants}
        className="p-2"
        aria-label="Manage variants"
      >
        <Layers className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onDelete}
        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        aria-label="Delete product"
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

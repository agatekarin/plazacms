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
import { Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function ProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onEdit() {
    router.push(`/admin/products/${product.id}/edit`);
  }

  function onVariants() {
    router.push(`/admin/products/${product.id}/edit?tab=variations`);
  }

  function onDelete() {
    if (!confirm("Delete this product?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Failed to delete");
        return;
      }
      toast.success("Product deleted successfully");
      router.refresh();
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

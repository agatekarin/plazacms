"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Layers } from "lucide-react";
import ProductVariantsManager from "./ProductVariantsManager";
import ProductEditorModal from "./ProductEditorModal";

export default function ProductActions({
  product,
  categories,
  taxClasses,
}: {
  product: any;
  categories: { id: string; name: string }[];
  taxClasses: { id: string; name: string; rate: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openVariants, setOpenVariants] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onEdit() {
    setOpen(true);
  }

  function onDelete() {
    if (!confirm("Delete this product?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to delete");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button aria-label="Edit" onClick={onEdit} className="rounded-md p-1 hover:bg-gray-100">
        <Pencil className="h-4 w-4" />
      </button>
      <button aria-label="Variants" onClick={() => setOpenVariants(true)} className="rounded-md p-1 hover:bg-gray-100">
        <Layers className="h-4 w-4" />
      </button>
      <button aria-label="Delete" onClick={onDelete} className="rounded-md p-1 text-red-600 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
      </button>
      <ProductEditorModal
        open={open}
        onClose={()=>{ setOpen(false); router.refresh(); }}
        mode="edit"
        categories={categories}
        taxClasses={taxClasses}
        initialProduct={product}
      />

      {openVariants && (
        <ProductVariantsManager productId={product.id} onClose={() => setOpenVariants(false)} />
      )}
    </div>
  );
}

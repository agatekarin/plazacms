"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ProductEditorModal from "./ProductEditorModal";
import type { CategoryOption, TaxClassOption } from "./ProductEditor";

export default function ProductsHeader({ categories, taxClasses }: { categories: CategoryOption[]; taxClasses: TaxClassOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Products</h1>
      <button onClick={() => setOpen(true)} className="rounded-md bg-gray-900 px-3 py-2 text-white">Add Product</button>
      <ProductEditorModal
        open={open}
        onClose={() => { setOpen(false); router.refresh(); }}
        mode="create"
        categories={categories}
        taxClasses={taxClasses}
      />
    </div>
  );
}

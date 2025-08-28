"use client";

import ProductEditor, { CategoryOption, TaxClassOption } from "./ProductEditor";

export default function ProductEditorModal({
  open,
  onClose,
  mode,
  categories,
  taxClasses,
  initialProduct,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  categories: CategoryOption[];
  taxClasses: TaxClassOption[];
  initialProduct?: any;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-4 max-h-[90vh]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">{mode === "create" ? "Add Product" : "Edit Product"}</div>
          <button onClick={onClose} className="rounded-md px-2 py-1 hover:bg-gray-100">Close</button>
        </div>
        <ProductEditor mode={mode} categories={categories} taxClasses={taxClasses} initialProduct={initialProduct} />
      </div>
    </div>
  );
}

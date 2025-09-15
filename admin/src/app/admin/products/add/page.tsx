"use client";

import { useEffect, useState } from "react";
import ProductEditor from "../ProductEditor";

export default function AddProductPage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [taxClasses, setTaxClasses] = useState<
    { id: string; name: string; rate: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/categories`, { cache: "no-store" }),
      fetch(`/api/admin/tax-classes?active=true`, { cache: "no-store" }),
    ])
      .then(async ([cRes, tRes]) => {
        const c = await cRes.json().catch(() => ({}));
        const t = await tRes.json().catch(() => ({}));
        if (cancelled) return;
        setCategories(Array.isArray(c.items) ? c.items : []);
        setTaxClasses(Array.isArray(t.items) ? t.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setTaxClasses([]);
      });
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import ProductEditor, { Product } from "../../ProductEditor";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const initialTab = (sp.get("tab") || undefined) as any;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [taxClasses, setTaxClasses] = useState<
    { id: string; name: string; rate: string }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/products/${id}`, { cache: "no-store" }),
      fetch(`/api/admin/categories`, { cache: "no-store" }),
      fetch(`/api/admin/tax-classes?active=true`, { cache: "no-store" }),
    ])
      .then(async ([pRes, cRes, tRes]) => {
        if (pRes.status === 404) {
          router.push("/admin/products");
          return;
        }
        const p = await pRes.json().catch(() => ({}));
        const c = await cRes.json().catch(() => ({}));
        const t = await tRes.json().catch(() => ({}));
        if (cancelled) return;
        if (p?.item) setProduct(p.item as Product);
        setCategories(Array.isArray(c.items) ? c.items : []);
        setTaxClasses(Array.isArray(t.items) ? t.items : []);
      })
      .catch(() => {
        if (!cancelled) router.push("/admin/products");
      });
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

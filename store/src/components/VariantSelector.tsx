"use client";

import { useEffect, useMemo, useState } from "react";

type Option = {
  attribute_id: string;
  name: string;
  values: Array<{ id: string; value: string }>;
};
type VariantRow = {
  id: string;
  sku: string | null;
  stock: number;
  price: string;
  image_url?: string | null;
  value_ids: string[];
  attrs?: Array<{
    attribute_id: string;
    attribute_name: string;
    value_id: string;
    value: string;
  }>;
};

export default function VariantSelector({
  productId,
  onChange,
}: {
  productId: string;
  onChange: (
    v: {
      variantId?: string;
      price?: number;
      label?: string;
      image?: string | null;
    } | null
  ) => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/products/${productId}/variants`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setOptions(data.options || []);
      setVariants(data.variants || []);
    })();
  }, [productId]);

  const matched = useMemo(() => {
    const sel = Object.values(selected);
    if (!sel.length) return null;
    const setSel = new Set(sel);
    return (
      variants.find(
        (v) =>
          v.value_ids.length === setSel.size &&
          v.value_ids.every((id) => setSel.has(id))
      ) || null
    );
  }, [selected, variants]);

  useEffect(() => {
    if (matched) {
      const label = (matched.attrs || [])
        .map((a) => `${a.attribute_name} ${a.value}`)
        .join(" • ");
      onChange({
        variantId: matched.id,
        price: Number(matched.price || 0),
        label,
        image: matched.image_url || null,
      });
    } else onChange(null);
  }, [matched]);

  if (!options.length) return null;

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <div key={opt.attribute_id} className="grid gap-1">
          <div className="text-sm font-medium">{opt.name}</div>
          <div className="flex flex-wrap gap-2">
            {opt.values.map((v) => {
              const active = selected[opt.attribute_id] === v.id;
              return (
                <button
                  key={v.id}
                  className={`h-8 px-3 rounded-lg border text-sm ${active ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [opt.attribute_id]: v.id }))
                  }
                >
                  {v.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {matched?.image_url && (
        <div className="mt-2">
          <img
            src={matched.image_url}
            alt="Variant"
            className="w-16 h-16 rounded border object-cover"
          />
        </div>
      )}
      {matched && matched.stock <= 0 && (
        <div className="text-xs text-red-600">
          Out of stock for this combination
        </div>
      )}
    </div>
  );
}

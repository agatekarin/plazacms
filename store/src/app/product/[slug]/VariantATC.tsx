"use client";

import { useState } from "react";
import VariantSelector from "@/components/VariantSelector";
import AddToCart from "@/components/AddToCart";

export default function VariantATC({ product }: { product: any }) {
  const [selected, setSelected] = useState<{
    variantId?: string;
    price?: number;
    label?: string;
    image?: string | null;
  } | null>(null);
  return (
    <div className="grid gap-3">
      <VariantSelector productId={product.id} onChange={setSelected} />
      <AddToCart
        product={{
          ...product,
          featured_image_url: selected?.image ?? product.featured_image_url,
        }}
        selectedVariantId={selected?.variantId}
        variantLabel={selected?.label ?? null}
      />
    </div>
  );
}

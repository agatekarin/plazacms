"use client";

import { useCart } from "@/store/cart";

async function addToCartApi(
  variantIdOrProductId: { product_variant_id?: string; product_id?: string },
  qty: number
) {
  const res = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...variantIdOrProductId, qty }),
  });
  if (!res.ok) throw new Error("Failed to add to cart");
  const data = await res.json();
  return data?.id as string;
}

type ProductLike = {
  id: string;
  name: string;
  regular_price: string;
  sale_price: string | null;
  currency: string;
  featured_image_url?: string | null;
};

export default function AddToCart({
  product,
  selectedVariantId,
  variantLabel,
}: {
  product: ProductLike;
  selectedVariantId?: string;
  variantLabel?: string | null;
}) {
  const { add } = useCart();
  const priceNumber = Number(product.sale_price ?? product.regular_price ?? 0);
  return (
    <div className="grid grid-cols-2 gap-2 md:max-w-sm">
      <button
        className="col-span-2 md:col-span-1 h-10 md:h-11 rounded-lg bg-gray-900 text-white text-sm md:text-base"
        onClick={async () => {
          const payload = selectedVariantId
            ? { product_variant_id: selectedVariantId }
            : { product_id: product.id };
          const cartItemId = await addToCartApi(payload, 1);
          add({
            id: cartItemId || selectedVariantId || product.id,
            name: product.name,
            price: priceNumber,
            currency: product.currency,
            qty: 1,
            image: product.featured_image_url ?? null,
            variantLabel: variantLabel ?? undefined,
          });
        }}
      >
        Add to Cart
      </button>
      <button className="col-span-2 md:col-span-1 h-10 md:h-11 rounded-lg border text-sm md:text-base">
        Buy Now
      </button>
    </div>
  );
}

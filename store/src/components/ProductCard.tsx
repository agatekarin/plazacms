import Link from "next/link";
import Image from "next/image";
import type { StoreProduct } from "@/lib/api";

type Props = { product: StoreProduct };

export default function ProductCard({ product }: Props) {
  const price = product.sale_price ?? product.regular_price;
  const isOnSale = Boolean(product.sale_price);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="bg-white rounded-xl border overflow-hidden hover:shadow transition-shadow"
    >
      <div className="aspect-square bg-gray-50 relative">
        {product.featured_image_url ? (
          <Image
            src={product.featured_image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-400 text-xs">
            No Image
          </div>
        )}
      </div>
      <div className="p-3 md:p-4">
        <p className="text-sm md:text-base font-medium line-clamp-2 text-gray-800">
          {product.name}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm md:text-base font-semibold text-gray-900">
            {price} {product.currency}
          </span>
          {isOnSale && (
            <span className="text-xs text-gray-400 line-through">
              {product.regular_price}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

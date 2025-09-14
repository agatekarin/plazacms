import Image from "next/image";
import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import AddToCart from "@/components/AddToCart";
import VariantATC from "./VariantATC";

type Props = { params: { slug: string } };

export default async function ProductDetailPage(props: Props) {
  const { params } = await props;
  // Adapt: our API by slug endpoint returns product by slug; reuse client with id signature by fetching API directly here
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_STORE_BASE_URL ?? "http://localhost:3002"}/api/products/by-slug/${params.slug}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const product = await res.json();

  const price = product.sale_price ?? product.regular_price;

  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[1280px] px-3 md:px-6 pb-16 md:py-6 grid md:grid-cols-[520px_1fr] gap-6">
        <div>
          <div className="aspect-[4/5] md:rounded-xl overflow-hidden bg-gray-50 relative">
            {product.featured_image_url ? (
              <Image
                src={product.featured_image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 520px"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                No Image
              </div>
            )}
          </div>
        </div>
        <div className="md:pt-6">
          <h1 className="text-base md:text-2xl font-semibold text-gray-900">
            {product.name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-base md:text-xl font-semibold text-gray-900">
              {price} {product.currency}
            </span>
            {product.sale_price && (
              <span className="text-sm text-gray-400 line-through">
                {product.regular_price}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs md:text-sm text-gray-700 line-clamp-3 md:line-clamp-none">
            {product.description}
          </p>
          <VariantATC product={product} />
        </div>
      </main>
      {/* Sticky mobile actions */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-3 md:hidden">
        <VariantATC product={product} />
      </div>
      <BottomBar />
    </div>
  );
}

// removed dynamic client chunk; using dedicated client component instead

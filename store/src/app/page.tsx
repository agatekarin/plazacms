import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import ProductCard from "@/components/ProductCard";
import { fetchProducts } from "@/lib/api";

export default async function Home() {
  const { items } = await fetchProducts({ limit: 12, offset: 0 });
  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[1280px] px-3 md:px-6 py-3 md:py-6">
        <h1 className="sr-only">Products</h1>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
      <BottomBar />
    </div>
  );
}

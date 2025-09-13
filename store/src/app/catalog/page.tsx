import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import ProductCard from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import { fetchProducts, fetchCategories } from "@/lib/api";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string };
}) {
  const q = searchParams?.q;
  const category = searchParams?.category;
  const [{ items }, categories] = await Promise.all([
    fetchProducts({
      q: q ?? undefined,
      category: category ?? undefined,
      limit: 24,
      offset: 0,
    }),
    fetchCategories(),
  ]);

  return (
    <div className="min-h-dvh bg-white">
      <Header />
      <main className="mx-auto max-w-[1280px] px-3 md:px-6 py-3 md:py-6 grid md:grid-cols-[250px_1fr] gap-6">
        <aside className="hidden md:block">
          <div className="sticky top-[72px] space-y-4">
            <div className="border rounded-xl p-4">
              <h2 className="text-sm font-semibold mb-2">Filters</h2>
              <div className="grid gap-2">
                {categories.items.map((c) => {
                  const active = category === c.id;
                  const sp = new URLSearchParams();
                  if (q) sp.set("q", q);
                  sp.set("category", c.id);
                  return (
                    <a
                      key={c.id}
                      href={`/catalog?${sp.toString()}`}
                      className={`text-sm rounded-lg px-3 py-2 border ${active ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
                    >
                      {c.name}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
        <section>
          <div className="mb-3 md:mb-4 flex items-center justify-between">
            <h1 className="text-base md:text-xl font-semibold text-gray-900">
              Catalog
            </h1>
          </div>
          <ProductGrid
            q={q ?? undefined}
            category={category ?? undefined}
            initialItems={items}
            pageSize={24}
          />
        </section>
      </main>
      <BottomBar />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { fetchProducts, type StoreProduct } from "@/lib/api";

type Props = {
  q?: string;
  category?: string;
  initialItems: StoreProduct[];
  pageSize?: number;
};

export default function ProductGrid({
  q,
  category,
  initialItems,
  pageSize = 24,
}: Props) {
  const [items, setItems] = useState<StoreProduct[]>(initialItems);
  const [offset, setOffset] = useState<number>(initialItems.length);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(
    initialItems.length >= pageSize
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const queryKey = useMemo(
    () => JSON.stringify({ q, category }),
    [q, category]
  );

  useEffect(() => {
    // reset when query changes
    setItems(initialItems);
    setOffset(initialItems.length);
    setHasMore(initialItems.length >= pageSize);
  }, [initialItems, queryKey, pageSize]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      async (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loading) {
          setLoading(true);
          try {
            const res = await fetchProducts({
              q,
              category,
              limit: pageSize,
              offset,
            });
            setItems((prev) => [...prev, ...res.items]);
            setOffset((prev) => prev + res.items.length);
            if (res.items.length < pageSize) setHasMore(false);
          } finally {
            setLoading(false);
          }
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [q, category, pageSize, offset, hasMore, loading]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        {items.map((p) => (
          <ProductCard key={`${p.id}-${p.slug}`} product={p} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loading && (
        <p className="text-center py-3 text-sm text-gray-500">Loading…</p>
      )}
      {!hasMore && items.length > 0 && (
        <p className="text-center py-3 text-sm text-gray-400">
          No more products
        </p>
      )}
    </>
  );
}

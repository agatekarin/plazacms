"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function ProductsToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") || "";
  const filter = sp.get("filter") || "all";

  const setParam = useCallback(
    (key: string, value?: string) => {
      const next = new URLSearchParams(sp.toString());
      if (value && value.length) next.set(key, value);
      else next.delete(key);
      // reset page when filter/search changes
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, sp]
  );

  const tabs = useMemo(
    () => [
      { key: "all", label: `All (${total})` },
      { key: "on_sale", label: "On Sale" },
      { key: "out_of_stock", label: "Out of Stock" },
    ],
    [total]
  );

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setParam("filter", t.key)}
              className={`rounded-md px-3 py-2 text-sm ${filter === t.key ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search products..."
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                setParam("q", v || undefined);
              }
            }}
            className="w-full rounded-md border border-gray-200 px-3 py-2 md:w-72"
          />
          <button
            onClick={() => {
              const el = document.activeElement as HTMLInputElement | null;
              const v = el && el.tagName === 'INPUT' ? el.value : q;
              setParam("q", v || undefined);
            }}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
          >Search</button>
        </div>
      </div>
    </div>
  );
}

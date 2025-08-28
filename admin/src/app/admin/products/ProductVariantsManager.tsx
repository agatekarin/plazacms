"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { X, Plus, Trash2 } from "lucide-react";

export default function ProductVariantsManager({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  // selections: record<attributeId, string[]> of attribute_value_id
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // add single variant form
  const [singleSel, setSingleSel] = useState<Record<string, string>>({}); // attributeId -> valueId
  const [singleSku, setSingleSku] = useState("");
  const [singleStock, setSingleStock] = useState("0");
  const [singlePrice, setSinglePrice] = useState("");
  const [singleSalePrice, setSingleSalePrice] = useState("");
  const [singleStatus, setSingleStatus] = useState("draft");

  function toggleSelection(attrId: string, valId: string) {
    setSelections((s) => {
      const cur = new Set(s[attrId] || []);
      if (cur.has(valId)) cur.delete(valId);
      else cur.add(valId);
      return { ...s, [attrId]: Array.from(cur) };
    });
  }

  const cartesianPreview = useMemo(() => {
    const arrays = Object.values(selections).filter((arr) => arr.length > 0);
    if (!arrays.length) return 0;
    return arrays.reduce((acc, arr) => acc * arr.length, 1);
  }, [selections]);

  function load() {
    setError(null);
    Promise.all([
      fetch(`/api/admin/attributes`).then((r) => r.json()),
      fetch(`/api/admin/products/${productId}/variants`).then((r) => r.json()),
    ])
      .then(([attrRes, varRes]) => {
        setAttributes(attrRes.items || []);
        setVariants(varRes.items || []);
      })
      .catch((e) => setError(e?.message || "Failed to load"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function generate() {
    const payload = { selections: Object.values(selections).filter((arr) => arr.length > 0) };
    if (!payload.selections.length) {
      setError("Pilih minimal 1 nilai atribut untuk generate varian");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${productId}/variants/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Gagal generate varian");
        return;
      }
      setSelections({});
      load();
    });
  }

  function addSingleVariant() {
    const attribute_value_ids = Object.values(singleSel).filter(Boolean);
    if (attribute_value_ids.length === 0) {
      setError("Pilih minimal 1 nilai atribut untuk varian");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attribute_value_ids,
          sku: singleSku || null,
          regular_price: singlePrice ? Number(singlePrice) : null,
          sale_price: singleSalePrice ? Number(singleSalePrice) : null,
          stock: Number(singleStock) || 0,
          status: singleStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Gagal menambah varian");
        return;
      }
      // reset minimal fields
      setSingleSku("");
      setSingleStock("0");
      setSinglePrice("");
      setSingleSalePrice("");
      setSingleStatus("draft");
      setSingleSel({});
      load();
    });
  }

  function deleteVariant(variantId: string) {
    if (!confirm("Hapus varian ini?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${productId}/variants/${variantId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Gagal hapus varian");
        return;
      }
      load();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-5xl rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Product Variants</div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-100 p-2 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="mb-2 text-xs font-semibold text-gray-600">Attributes</div>
            <div className="rounded-lg border border-gray-200">
              {attributes.map((attr) => (
                <div key={attr.id} className="border-b border-gray-100 p-3 last:border-b-0">
                  <div className="mb-2 text-sm font-medium">{attr.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((v: any) => {
                      const active = (selections[attr.id] || []).includes(v.id);
                      return (
                        <button
                          key={v.id}
                          onClick={() => toggleSelection(attr.id, v.id)}
                          className={`rounded-md px-2 py-1 text-xs ${active ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                        >
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
              <div>Preview kombinasi: {cartesianPreview}</div>
              <button onClick={generate} disabled={isPending} className="rounded-md bg-gray-900 px-3 py-2 text-white">
                {isPending ? "Generating..." : (
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Generate Variants
                  </span>
                )}
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 p-3">
              <div className="mb-2 text-xs font-semibold text-gray-600">Add Single Variant</div>
              <div className="grid gap-2">
                {attributes.map((attr) => (
                  <div key={attr.id} className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">{attr.name}</label>
                    <select
                      value={singleSel[attr.id] || ""}
                      onChange={(e) => setSingleSel((s) => ({ ...s, [attr.id]: e.target.value }))}
                      className="rounded-md border border-gray-200 px-2 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {attr.values.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.value}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">SKU</label>
                    <input value={singleSku} onChange={(e)=>setSingleSku(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">Stock</label>
                    <input value={singleStock} onChange={(e)=>setSingleStock(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">Regular Price</label>
                    <input value={singlePrice} onChange={(e)=>setSinglePrice(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2 text-sm" />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">Sale Price</label>
                    <input value={singleSalePrice} onChange={(e)=>setSingleSalePrice(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <select value={singleStatus} onChange={(e)=>setSingleStatus(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2 text-sm">
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="private">private</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div className="pt-1">
                  <button onClick={addSingleVariant} disabled={isPending} className="w-full rounded-md bg-gray-900 px-3 py-2 text-white">
                    {isPending ? "Adding..." : "Add Variant"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 text-xs font-semibold text-gray-600">Existing Variants</div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Attributes</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Stock</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Price</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-t border-gray-200">
                      <td className="px-3 py-2">
                        {(v.attributes || []).map((a: any) => a.value).join(" / ") || "—"}
                      </td>
                      <td className="px-3 py-2">{v.sku || "—"}</td>
                      <td className="px-3 py-2">{v.stock}</td>
                      <td className="px-3 py-2">{v.regular_price ?? "—"}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => deleteVariant(v.id)} className="rounded-md p-1 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {variants.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>Belum ada varian</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

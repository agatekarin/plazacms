"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProductVariantsManager from "./ProductVariantsManager";

export type CategoryOption = { id: string; name: string };
export type TaxClassOption = { id: string; name: string; rate: string };

type ProductEditorProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  taxClasses: TaxClassOption[];
  initialProduct?: any; // when edit
};

export default function ProductEditor({ mode, categories, taxClasses, initialProduct }: ProductEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: initialProduct?.name || "",
    slug: initialProduct?.slug || "",
    description: initialProduct?.description || "",
    regular_price: initialProduct?.regular_price?.toString?.() || "",
    currency: initialProduct?.currency || "USD",
    stock: (initialProduct?.stock ?? 0).toString(),
    category_id: initialProduct?.category_id || "",
    status: initialProduct?.status || "draft",
    sku: initialProduct?.sku || "",
    weight: (initialProduct?.weight ?? 0).toString(),
    sale_price: initialProduct?.sale_price?.toString?.() || "",
    sale_start_date: initialProduct?.sale_start_date ? toLocalDateTime(initialProduct.sale_start_date) : "",
    sale_end_date: initialProduct?.sale_end_date ? toLocalDateTime(initialProduct.sale_end_date) : "",
    tax_class_id: initialProduct?.tax_class_id || "",
  });

  const [productType, setProductType] = useState<"simple" | "variable">("simple");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [showVariants, setShowVariants] = useState(false);

  useEffect(() => {
    if (productType === "variable") {
      fetch("/api/admin/attributes")
        .then((r) => r.json())
        .then((d) => setAttributes(d.items || []))
        .catch(() => setAttributes([]));
    }
  }, [productType]);

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

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function submitCreate() {
    const payload = toPayload(form, productType);
    if (!payload) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return setError(data?.error || "Failed to create product");
        const newId = data?.item?.id as string | undefined;
        if (newId && productType === "variable" && autoGenerate) {
          const payloadGen = { selections: Object.values(selections).filter((arr) => arr.length > 0) } as { selections: string[][] };
          if (payloadGen.selections.length > 0) {
            await fetch(`/api/admin/products/${newId}/variants/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payloadGen),
            }).catch(() => {});
          }
        }
        setSuccess("Product created");
        setTimeout(() => router.push("/admin/products"), 400);
      } catch (e: any) {
        setError(e?.message || "Network error");
      }
    });
  }

  function submitUpdate() {
    if (!initialProduct?.id) return;
    const payload = toPayload(form, productType);
    if (!payload) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/products/${initialProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setError(data?.error || "Failed to update product");
        setSuccess("Product updated");
        router.refresh();
      } catch (e: any) {
        setError(e?.message || "Network error");
      }
    });
  }

  function submitDelete() {
    if (!initialProduct?.id) return;
    if (!confirm("Delete this product?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${initialProduct.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return alert(data?.error || "Failed to delete");
      router.push("/admin/products");
    });
  }

  return (
    <div className="max-w-5xl">
      <Card>
        <div className="p-4">
          <div className="mb-4 text-base font-semibold">{mode === "create" ? "Add New Product" : "Edit Product"}</div>

          {/* Basic Information */}
          <Section title="Basic Information">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Product Name" required>
                <input name="name" value={form.name} onChange={onChange} className="input" placeholder="Product name" />
              </Field>
              <Field label="Slug" required>
                <input name="slug" value={form.slug} onChange={onChange} className="input" placeholder="my-product-slug" />
              </Field>
              <Field label="SKU">
                <input name="sku" value={form.sku} onChange={onChange} className="input" placeholder="e.g., IPHONE-15-PRO-001" />
              </Field>
              <div />
              <Field label="Description">
                <textarea name="description" value={form.description} onChange={onChange} className="textarea" rows={4} placeholder="Write a description..." />
              </Field>
              <div />
              <Field label="Category">
                <select name="category_id" value={form.category_id} onChange={onChange} className="input">
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-1">
                <span className="text-xs font-semibold text-gray-700">Product Status</span>
                <label className="flex items-center gap-3">
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.status === "published" ? "bg-green-600" : "bg-gray-300"}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.status === "published" ? "translate-x-5" : "translate-x-1"}`}></span>
                  </span>
                  <input type="checkbox" className="hidden" checked={form.status === "published"} onChange={(e)=>setForm((f)=>({ ...f, status: e.target.checked?"published":"draft" }))} />
                  <span className="text-sm text-gray-700">{form.status === "published" ? "Active" : "Draft"}</span>
                </label>
              </div>
            </div>
          </Section>

          {/* Product Type */}
          <Section title="Product Type">
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="ptype" checked={productType === "simple"} onChange={()=>setProductType("simple")} />
                Simple Product
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="ptype" checked={productType === "variable"} onChange={()=>setProductType("variable")} />
                Variable Product
              </label>
            </div>
          </Section>

          {/* Product Images */}
          <Section title="Product Images">
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full border border-gray-200" />
              <div className="mb-1">Upload images or drag and drop</div>
              <div className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</div>
            </div>
          </Section>

          {/* Pricing (simple products only) */}
          {productType === "simple" && (
            <Section title="Pricing">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Product Price" required>
                  <input name="regular_price" value={form.regular_price} onChange={onChange} className="input" placeholder="0.00" />
                </Field>
                <Field label="Discounted Price (Optional)">
                  <input name="sale_price" value={form.sale_price} onChange={onChange} className="input" placeholder="" />
                </Field>
                <Field label="Currency" required>
                  <input name="currency" value={form.currency} onChange={onChange} className="input" placeholder="USD" />
                </Field>
                <Field label="Start">
                  <input type="datetime-local" name="sale_start_date" value={form.sale_start_date} onChange={onChange} className="input" />
                </Field>
                <Field label="End">
                  <input type="datetime-local" name="sale_end_date" value={form.sale_end_date} onChange={onChange} className="input" />
                </Field>
              </div>
            </Section>
          )}

          {/* Variable Config */}
          {productType === "variable" && (
            <Section title="Variable Product Configuration">
              <div className="mb-2 text-sm font-semibold">Variable Attributes</div>
              <div className="rounded-lg border border-gray-200">
                {attributes.map((attr:any) => (
                  <div key={attr.id} className="border-b border-gray-100 p-3 last:border-b-0">
                    <div className="mb-2 text-sm font-medium">{attr.name}</div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                      {attr.values.map((v: any) => {
                        const active = (selections[attr.id] || []).includes(v.id);
                        return (
                          <label key={v.id} className="inline-flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={active} onChange={()=>toggleSelection(attr.id, v.id)} /> {v.value}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {attributes.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No attributes yet. Add them in Admin → Attributes.</div>
                )}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Field label="Base Price for Variants">
                  <input className="input" placeholder="0" />
                </Field>
                <Field label="Base Sale Price (Optional)">
                  <input className="input" placeholder="0" />
                </Field>
                <Field label="Base Stock for Variants">
                  <input className="input" placeholder="0" />
                </Field>
                <Field label="Base Weight (grams)">
                  <input className="input" placeholder="0" />
                </Field>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-600">Variants are auto-generated based on selected attributes. You can add additional variants manually if needed.</div>
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => {
                    if (!initialProduct?.id) return alert("Create product first, then add variants");
                    setShowVariants(true);
                  }}
                >
                  + Add Variant
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-600">Preview combinations: {cartesianPreview}</div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={autoGenerate} onChange={(e)=>setAutoGenerate(e.target.checked)} />
                Auto generate variants after create
              </label>
            </Section>
          )}

          {/* Footer actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={()=>router.push("/admin/products")}>Cancel</button>
            {mode === "create" ? (
              <button onClick={submitCreate} disabled={isPending} className="btn-primary">{isPending?"Creating...":"Create Product"}</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={submitUpdate} disabled={isPending} className="btn-primary">{isPending?"Updating...":"Update Product"}</button>
                <button onClick={submitDelete} disabled={isPending} className="btn-danger">Delete</button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {showVariants && initialProduct?.id ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white p-4">
            <ProductVariantsManager productId={initialProduct.id} onClose={() => { setShowVariants(false); }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-gray-700">
        {label} {required ? <em className="not-italic text-red-600">*</em> : null}
      </span>
      {children}
    </label>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">{children}</div>;
}
function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-gray-200 p-3 text-sm font-semibold">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 p-3 text-sm font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function toLocalDateTime(value: string) {
  try {
    const d = new Date(value);
    // format to yyyy-MM-ddTHH:mm
    const pad = (n:number)=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function toPayload(form: any, productType: "simple" | "variable") {
  try {
    if (!form.name?.trim()) throw new Error("Name is required");
    if (!form.slug?.trim()) throw new Error("Slug is required");
    // Pricing is required only for simple products. For variable, allow blank; default to 0.
    if (productType === "simple") {
      if (!form.regular_price?.toString?.().trim() || isNaN(Number(form.regular_price))) throw new Error("Regular price must be a number");
    }
    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description?.trim() || null,
      regular_price: productType === "simple" ? Number(form.regular_price) : Number(form.regular_price || 0),
      currency: form.currency,
      stock: Number(form.stock || 0),
      category_id: form.category_id || null,
      status: form.status,
      sku: form.sku || null,
      weight: Number(form.weight || 0),
      sale_price: productType === "simple" && form.sale_price ? Number(form.sale_price) : null,
      sale_start_date: productType === "simple" ? (form.sale_start_date || null) : null,
      sale_end_date: productType === "simple" ? (form.sale_end_date || null) : null,
      tax_class_id: form.tax_class_id || null,
    };
  } catch (e:any) {
    alert(e?.message || "Invalid form");
    return null;
  }
}

// basic utility classes
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      className?: string;
    }
  }
}

// tailwind-compatible utility class names
// input/textarea/buttons are styled with classNames used elsewhere in the admin
// .input, .textarea, .btn-primary, .btn-secondary, .btn-danger
// If you don't have global styles, Tailwind class names are used directly above.

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CategoryOption = { id: string; name: string };
type TaxClassOption = { id: string; name: string; rate: string };

export default function AddProductForm({
  categories,
  taxClasses,
}: {
  categories: CategoryOption[];
  taxClasses: TaxClassOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    regular_price: "",
    currency: "USD",
    stock: "0",
    category_id: "",
    status: "draft",
    sku: "",
    weight: "0",
    sale_price: "",
    sale_start_date: "",
    sale_end_date: "",
    tax_class_id: "",
  });

  // product type and variant generation helpers
  const [productType, setProductType] = useState<"simple" | "variable">("simple");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [attributes, setAttributes] = useState<any[]>([]);
  // selections: record<attributeId, string[]> of attribute_value_id
  const [selections, setSelections] = useState<Record<string, string[]>>({});

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // simple client validation
    if (!form.name.trim()) return setError("Name is required");
    if (!form.slug.trim()) return setError("Slug is required");
    if (!form.regular_price.trim() || isNaN(Number(form.regular_price))) return setError("Regular price must be a number");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      regular_price: Number(form.regular_price),
      currency: form.currency,
      stock: Number(form.stock || 0),
      category_id: form.category_id || null,
      status: form.status,
      sku: form.sku || null,
      weight: Number(form.weight || 0),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      sale_start_date: form.sale_start_date || null,
      sale_end_date: form.sale_end_date || null,
      tax_class_id: form.tax_class_id || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Failed to create product");
          return;
        }
        const newId = data?.item?.id as string | undefined;
        // If variable, optionally auto-generate variants based on selections
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
        // redirect to list after short delay
        setTimeout(() => router.push("/admin/products"), 400);
      } catch (err: any) {
        setError(err?.message || "Network error");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 720 }}>
      {error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 6 }}>{error}</div>}
      {success && <div style={{ background: "#dcfce7", color: "#166534", padding: 10, borderRadius: 6 }}>{success}</div>}

      <Field label="Name" required>
        <input name="name" value={form.name} onChange={onChange} placeholder="Product name" required style={inputStyle} />
      </Field>

      <Field label="Slug" required help="Unique URL slug">
        <input name="slug" value={form.slug} onChange={onChange} placeholder="unique-slug" required style={inputStyle} />
      </Field>

      <Field label="Description">
        <textarea name="description" value={form.description} onChange={onChange} placeholder="Description" rows={4} style={textareaStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Product Type" required>
          <select value={productType} onChange={(e)=>setProductType(e.target.value as any)} style={inputStyle}>
            <option value="simple">Simple product</option>
            <option value="variable">Variable product</option>
          </select>
        </Field>
        <div />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Regular Price" required>
          <input name="regular_price" value={form.regular_price} onChange={onChange} placeholder="0.00" required style={inputStyle} />
        </Field>
        <Field label="Currency" required>
          <input name="currency" value={form.currency} onChange={onChange} placeholder="USD" required style={inputStyle} />
        </Field>
        <Field label="Stock" required>
          <input name="stock" value={form.stock} onChange={onChange} placeholder="0" required style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select name="category_id" value={form.category_id} onChange={onChange} style={inputStyle}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Tax Class">
          <select name="tax_class_id" value={form.tax_class_id} onChange={onChange} style={inputStyle}>
            <option value="">—</option>
            {taxClasses.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" required>
          <select name="status" value={form.status} onChange={onChange} style={inputStyle}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="private">private</option>
            <option value="archived">archived</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="SKU">
          <input name="sku" value={form.sku} onChange={onChange} placeholder="SKU" style={inputStyle} />
        </Field>
        <Field label="Weight">
          <input name="weight" value={form.weight} onChange={onChange} placeholder="0" style={inputStyle} />
        </Field>
        <Field label="Sale Price">
          <input name="sale_price" value={form.sale_price} onChange={onChange} placeholder="" style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sale Start">
          <input type="datetime-local" name="sale_start_date" value={form.sale_start_date} onChange={onChange} style={inputStyle} />
        </Field>
        <Field label="Sale End">
          <input type="datetime-local" name="sale_end_date" value={form.sale_end_date} onChange={onChange} style={inputStyle} />
        </Field>
      </div>

      {productType === "variable" && (
        <div style={{ display: "grid", gap: 8, border: "1px solid #e5e7eb", borderRadius: 6, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Attributes for variations</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Preview combinations: {cartesianPreview}</div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {attributes.map((attr) => (
              <div key={attr.id} style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{attr.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {attr.values.map((v: any) => {
                    const active = (selections[attr.id] || []).includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleSelection(attr.id, v.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid",
                          borderColor: active ? "#111827" : "#e5e7eb",
                          background: active ? "#111827" : "#f3f4f6",
                          color: active ? "white" : "#111827",
                          fontSize: 12,
                        }}
                      >
                        {v.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {attributes.length === 0 && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>No attributes yet. Add them in Admin → Attributes.</div>
            )}
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={autoGenerate} onChange={(e)=>setAutoGenerate(e.target.checked)} />
            Auto generate variants after create
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={isPending} style={primaryBtn}>{isPending ? "Saving..." : "Create Product"}</button>
        <button type="button" onClick={() => history.back()} disabled={isPending} style={secondaryBtn}>Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, children, required, help }: { label: string; children: React.ReactNode; required?: boolean; help?: string }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
        {label} {required ? <em style={{ color: "#ef4444", fontStyle: "normal" }}>*</em> : null}
      </span>
      {children}
      {help ? <span style={{ fontSize: 12, color: "#6b7280" }}>{help}</span> : null}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
};

const textareaStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  resize: "vertical",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#111827",
  color: "white",
  borderRadius: 6,
};

const secondaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#f3f4f6",
  color: "#111827",
  borderRadius: 6,
};

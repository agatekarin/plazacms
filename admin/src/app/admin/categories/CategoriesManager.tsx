"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CategoriesManager({ initialItems }: { initialItems: any[] }) {
  return (
    <div className="grid gap-4">
      <AddCategoryForm />
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Slug</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {initialItems.map((c) => (
              <tr key={c.id} className="border-t border-gray-200">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.slug}</td>
                <td className="px-3 py-2">
                  <DeleteCategoryButton id={c.id} />
                </td>
              </tr>
            ))}
            {initialItems.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={3}>No categories</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddCategoryForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      startTransition(async () => {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug }),
        });
        if (res.ok) { setName(""); setSlug(""); router.refresh(); }
        else { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); }
      });
    }} className="flex items-end gap-2">
      <div className="grid gap-1">
        <label className="text-xs font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e)=>setName(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2" />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-medium text-gray-700">Slug</label>
        <input value={slug} onChange={(e)=>setSlug(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2" />
      </div>
      <button disabled={isPending} className="rounded-md bg-gray-900 px-3 py-2 text-white">{isPending?"Saving...":"Add"}</button>
    </form>
  );
}

function DeleteCategoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button onClick={() => {
      if (!confirm("Delete category?")) return;
      startTransition(async ()=>{
        const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
        if (res.ok) router.refresh(); else { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); }
      });
    }} disabled={isPending} className="rounded-md bg-red-50 px-2 py-1 text-red-700">Delete</button>
  );
}

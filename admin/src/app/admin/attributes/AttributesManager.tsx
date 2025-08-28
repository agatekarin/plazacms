"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AttributesManager({ initialItems }: { initialItems: { id: string; name: string; values: { id: string; value: string }[] }[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAttrModal, setShowAttrModal] = useState<null | { mode: "add" | "edit"; id?: string; name?: string }>(null);
  const [showValueModal, setShowValueModal] = useState<null | { mode: "add" | "edit"; attributeId: string; valueId?: string; value?: string }>(null);
  const items = initialItems;

  const selectedAttr = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Attributes</h2>
          <p className="text-sm text-gray-500">Manage product attributes and their values</p>
        </div>
        <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white" onClick={()=>setShowAttrModal({ mode: "add" })}>+ Add Attribute</button>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Left list */}
        <div className="rounded-lg border border-gray-200 bg-white p-2">
          {items.map((a) => (
            <button
              key={a.id}
              onClick={()=>setSelectedId(a.id)}
              className={`mb-2 w-full rounded-md border px-3 py-3 text-left ${selectedId===a.id?"border-blue-200 bg-blue-50":"border-gray-200 hover:bg-gray-50"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-gray-500">Type: select</div>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">Variable</span>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700">Filterable</span>
                  </div>
                </div>
                <div className="flex gap-2 pl-2">
                  <button type="button" className="text-xs text-blue-600" onClick={(e)=>{e.stopPropagation(); setShowAttrModal({ mode: "edit", id: a.id, name: a.name });}}>✎</button>
                  <button type="button" className="text-xs text-red-600" onClick={async (e)=>{
                    e.stopPropagation();
                    if (!confirm("Delete attribute?")) return;
                    const res = await fetch(`/api/admin/attributes/${a.id}`, { method: "DELETE" });
                    if (res.ok) router.refresh(); else { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); }
                  }}>🗑️</button>
                </div>
              </div>
            </button>
          ))}
          {items.length === 0 && <div className="p-6 text-center text-gray-500">No attributes</div>}
        </div>

        {/* Right panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          {!selectedAttr ? (
            <div className="grid place-items-center p-12 text-center text-sm text-gray-500">
              <div className="mb-2 h-10 w-10 rounded-full border border-gray-200" />
              <div className="font-medium">Select an Attribute</div>
              <div className="text-gray-500">Choose an attribute from the list to manage its values.</div>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">Values for "{selectedAttr.name}"</div>
                <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white" onClick={()=>setShowValueModal({ mode: "add", attributeId: selectedAttr.id })}>+ Add Value</button>
              </div>
              <div className="grid gap-2">
                {selectedAttr.values.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{v.value}</span>
                    </div>
                    <div className="flex gap-3">
                      <button className="text-xs text-blue-600" onClick={()=>setShowValueModal({ mode: "edit", attributeId: selectedAttr.id, valueId: v.id, value: v.value })}>✎</button>
                      <button className="text-xs text-red-600" onClick={async ()=>{
                        const res = await fetch(`/api/admin/attributes/${selectedAttr.id}/values/${v.id}`, { method: "DELETE" });
                        if (res.ok) router.refresh(); else { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); }
                      }}>🗑️</button>
                    </div>
                  </div>
                ))}
                {selectedAttr.values.length === 0 && <div className="p-6 text-center text-gray-500">No values</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAttrModal && (
        <Modal onClose={()=>setShowAttrModal(null)} title={showAttrModal.mode === "add" ? "Add New Attribute" : "Edit Attribute"}>
          <AttributeForm
            mode={showAttrModal.mode}
            id={showAttrModal.id}
            name={showAttrModal.name || ""}
            onDone={()=>{ setShowAttrModal(null); router.refresh(); }}
          />
        </Modal>
      )}
      {showValueModal && (
        <Modal onClose={()=>setShowValueModal(null)} title={showValueModal.mode === "add" ? "Add Value" : "Edit Value"}>
          <ValueForm
            mode={showValueModal.mode}
            attributeId={showValueModal.attributeId}
            valueId={showValueModal.valueId}
            value={showValueModal.value || ""}
            onDone={()=>{ setShowValueModal(null); router.refresh(); }}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white">
        <div className="border-b border-gray-200 p-3 text-sm font-semibold">{title}</div>
        <div className="p-4">{children}</div>
        <div className="flex justify-end border-t border-gray-200 p-3">
          <button className="rounded-md px-3 py-2 text-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function AttributeForm({ mode, id, name, onDone }: { mode: "add" | "edit"; id?: string; name: string; onDone: () => void }) {
  const [val, setVal] = useState(name);
  const [seed, setSeed] = useState(""); // for optional comma-separated initial values when adding
  const [isPending, startTransition] = useTransition();

  return (
    <form onSubmit={(e)=>{
      e.preventDefault();
      startTransition(async ()=>{
        if (mode === "add") {
          const values = seed.split(",").map((x)=>x.trim()).filter(Boolean);
          const res = await fetch("/api/admin/attributes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: val, values }),
          });
          if (!res.ok) { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); return; }
        } else if (mode === "edit" && id) {
          const res = await fetch(`/api/admin/attributes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: val }),
          });
          if (!res.ok) { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); return; }
        }
        onDone();
      });
    }} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-xs font-medium text-gray-700">Name</label>
        <input value={val} onChange={(e)=>setVal(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2" />
      </div>
      {mode === "add" && (
        <div className="grid gap-1">
          <label className="text-xs font-medium text-gray-700">Initial Values (comma separated)</label>
          <input value={seed} onChange={(e)=>setSeed(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2" placeholder="Red, Blue, Green" />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-md px-3 py-2 text-sm" onClick={onDone}>Cancel</button>
        <button disabled={isPending} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">{isPending?"Saving...": (mode === "add" ? "Create Attribute" : "Save Changes")}</button>
      </div>
    </form>
  );
}

function ValueForm({ mode, attributeId, valueId, value, onDone }: { mode: "add" | "edit"; attributeId: string; valueId?: string; value: string; onDone: () => void }) {
  const [val, setVal] = useState(value);
  const [isPending, startTransition] = useTransition();
  return (
    <form onSubmit={(e)=>{
      e.preventDefault();
      startTransition(async ()=>{
        if (mode === "add") {
          const res = await fetch(`/api/admin/attributes/${attributeId}/values`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: val.trim() }),
          });
          if (!res.ok) { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); return; }
        } else if (mode === "edit" && valueId) {
          const res = await fetch(`/api/admin/attributes/${attributeId}/values/${valueId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: val.trim() }),
          });
          if (!res.ok) { const j = await res.json().catch(()=>({})); alert(j.error||"Failed"); return; }
        }
        onDone();
      });
    }} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-xs font-medium text-gray-700">Value</label>
        <input value={val} onChange={(e)=>setVal(e.target.value)} className="rounded-md border border-gray-200 px-2 py-2" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-md px-3 py-2 text-sm" onClick={onDone}>Cancel</button>
        <button disabled={isPending} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">{isPending?"Saving...": (mode === "add" ? "+ Add Value" : "Save Changes")}</button>
      </div>
    </form>
  );
}

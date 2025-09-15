"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Settings2, Edit3, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AttributesManager({
  initialItems,
}: {
  initialItems?: {
    id: string;
    name: string;
    values: { id: string; value: string }[];
  }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(
    Array.isArray(initialItems) ? initialItems : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAttrModal, setShowAttrModal] = useState<null | {
    mode: "add" | "edit";
    id?: string;
    name?: string;
  }>(null);
  const [showValueModal, setShowValueModal] = useState<null | {
    mode: "add" | "edit";
    attributeId: string;
    valueId?: string;
    value?: string;
  }>(null);

  async function reload() {
    try {
      const res = await fetch("/api/admin/attributes", { cache: "no-store" });
      const d = await res.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch (e) {
      setItems([]);
    }
  }

  useEffect(() => {
    if (!initialItems) {
      void reload();
    }
  }, []);

  const selectedAttr = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  return (
    <div className="space-y-6">
      {/* Modern Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Attributes List */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Attributes</h3>
            <Button
              size="sm"
              onClick={() => setShowAttrModal({ mode: "add" })}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No attributes yet</p>
                <p className="text-xs text-gray-400">
                  Create your first attribute
                </p>
              </div>
            ) : (
              items.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedId(a.id);
                  }}
                  className={`group p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedId === a.id
                      ? "border-blue-200 bg-blue-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">
                          {a.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        Type: select
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          Variable
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Filterable
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {a.values.length} value
                        {a.values.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAttrModal({
                            mode: "edit",
                            id: a.id,
                            name: a.name,
                          });
                        }}
                        title="Edit attribute"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            !confirm(
                              `Delete "${a.name}" attribute? This will also delete all its values.`
                            )
                          )
                            return;
                          const res = await fetch(
                            `/api/admin/attributes/${a.id}`,
                            { method: "DELETE" }
                          );
                          if (res.ok) {
                            if (selectedId === a.id) setSelectedId(null);
                            await reload();
                          } else {
                            const j = await res.json().catch(() => ({}));
                            toast.error(
                              j.error || "Failed to delete attribute"
                            );
                          }
                        }}
                        title="Delete attribute"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Values Panel */}
        <Card className="p-4">
          {!selectedAttr ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Settings2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                Select an Attribute
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Choose an attribute from the list to manage its values and
                settings.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Values for `{selectedAttr.name}`
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage the available options for this attribute
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setShowValueModal({
                      mode: "add",
                      attributeId: selectedAttr.id,
                    })
                  }
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Value
                </Button>
              </div>

              {selectedAttr.values.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">No values yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add values to make this attribute useful
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedAttr.values.map((v) => (
                    <div
                      key={v.id}
                      className="group flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></div>
                        <span className="font-medium text-gray-900">
                          {v.value}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="p-2"
                          onClick={() =>
                            setShowValueModal({
                              mode: "edit",
                              attributeId: selectedAttr.id,
                              valueId: v.id,
                              value: v.value,
                            })
                          }
                          title="Edit value"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Delete "${v.value}" value? This action cannot be undone.`
                              )
                            )
                              return;
                            const res = await fetch(
                              `/api/admin/attributes/${selectedAttr.id}/values/${v.id}`,
                              {
                                method: "DELETE",
                              }
                            );
                            if (res.ok) {
                              await reload();
                            } else {
                              const j = await res.json().catch(() => ({}));
                              toast.error(j.error || "Failed to delete value");
                            }
                          }}
                          title="Delete value"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      {showAttrModal && (
        <Modal
          onClose={() => setShowAttrModal(null)}
          title={
            showAttrModal.mode === "add"
              ? "Add New Attribute"
              : "Edit Attribute"
          }
        >
          <AttributeForm
            mode={showAttrModal.mode}
            id={showAttrModal.id}
            name={showAttrModal.name || ""}
            onDone={() => {
              setShowAttrModal(null);
              void reload();
            }}
          />
        </Modal>
      )}
      {showValueModal && (
        <Modal
          onClose={() => setShowValueModal(null)}
          title={showValueModal.mode === "add" ? "Add Value" : "Edit Value"}
        >
          <ValueForm
            mode={showValueModal.mode}
            attributeId={showValueModal.attributeId}
            valueId={showValueModal.valueId}
            value={showValueModal.value || ""}
            onDone={() => {
              setShowValueModal(null);
              void reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in-0 duration-300">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function AttributeForm({
  mode,
  id,
  name,
  onDone,
}: {
  mode: "add" | "edit";
  id?: string;
  name: string;
  onDone: () => void;
}) {
  const [val, setVal] = useState(name);
  const [seed, setSeed] = useState(""); // for optional comma-separated initial values when adding
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          if (mode === "add") {
            const values = seed
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
            const res = await fetch("/api/admin/attributes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: val, values }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j.error || "Failed to create attribute");
              return;
            }
          } else if (mode === "edit" && id) {
            const res = await fetch(`/api/admin/attributes/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: val }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j.error || "Failed to update attribute");
              return;
            }
          }
          onDone();
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Attribute Name
        </label>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g., Color, Size, Material"
          required
        />
        <p className="text-xs text-gray-500">
          This will be used to group product variations
        </p>
      </div>

      {mode === "add" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Initial Values
          </label>
          <Input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Red, Blue, Green, Yellow"
          />
          <p className="text-xs text-gray-500">
            Comma-separated values. You can add more later.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !val.trim()}>
          {isPending
            ? "Saving..."
            : mode === "add"
            ? "Create Attribute"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function ValueForm({
  mode,
  attributeId,
  valueId,
  value,
  onDone,
}: {
  mode: "add" | "edit";
  attributeId: string;
  valueId?: string;
  value: string;
  onDone: () => void;
}) {
  const [val, setVal] = useState(value);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          if (mode === "add") {
            const res = await fetch(
              `/api/admin/attributes/${attributeId}/values`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: val.trim() }),
              }
            );
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j.error || "Failed to add value");
              return;
            }
          } else if (mode === "edit" && valueId) {
            const res = await fetch(
              `/api/admin/attributes/${attributeId}/values/${valueId}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: val.trim() }),
              }
            );
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j.error || "Failed to update value");
              return;
            }
          }
          onDone();
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Value Name</label>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="e.g., Red, Large, Cotton"
          required
        />
        <p className="text-xs text-gray-500">
          This will be an option for the attribute
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !val.trim()}>
          {isPending
            ? "Saving..."
            : mode === "add"
            ? "Add Value"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

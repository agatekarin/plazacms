"use client";

import React from "react";
import {
  PlusCircleIcon,
  PencilSquareIcon,
  PowerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export interface TaxClassRow {
  id: string;
  name: string;
  rate: string; // pg numeric as string
  is_active: boolean;
}

function formatPercent(rateDecimal: string): string {
  const n = Number(rateDecimal);
  if (Number.isNaN(n)) return "-";
  const pct = (n * 100).toFixed(2).replace(/\.00$/, "");
  return `${pct}%`;
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const base =
    "inline-flex items-center justify-center px-3 py-2 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
  return (
    <button aria-label={ariaLabel} type={type} className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; help?: string }
) {
  const { label, help, ...rest } = props;
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-900">{label}</label>}
      <input
        {...rest}
        className={[
          "h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none",
          "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10",
          props.className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {help && <p className="text-xs text-gray-500">{help}</p>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200/60 bg-white shadow-sm">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={`px-2 py-1 text-xs rounded-md font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function TaxClassesManager({ initialItems }: { initialItems: TaxClassRow[] }) {
  const [items, setItems] = React.useState<TaxClassRow[]>(initialItems);
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [ratePct, setRatePct] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/tax-classes", { cache: "no-store" });
    const d = await res.json();
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pct = Number(ratePct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("Rate must be between 0 and 100");
      return;
    }
    const rate = Math.round(pct * 10000) / 10000 / 100; // clamp to 4 decimals then convert to decimal
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tax-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rate, is_active: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to create");
      setName("");
      setRatePct("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: string, nextActive: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tax-classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to update");
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function edit(id: string, curName: string, curRate: string) {
    const newName = prompt("New name", curName)?.trim();
    if (!newName) return;
    const currentPct = (Number(curRate) * 100).toFixed(2).replace(/\.00$/, "");
    const newPctStr = prompt("New rate (%)", currentPct);
    if (newPctStr === null) return;
    const newPct = Number(newPctStr);
    if (Number.isNaN(newPct) || newPct < 0 || newPct > 100) {
      alert("Rate must be 0-100");
      return;
    }
    const rate = Math.round(newPct * 10000) / 10000 / 100;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tax-classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, rate }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Failed to update");
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tax class?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tax-classes/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Failed to delete");
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <Section title="Create New Tax Class">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Name"
              placeholder="Standard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Rate (%)"
              placeholder="10"
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit" disabled={loading} ariaLabel="Create">
                <PlusCircleIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </div>
            {error && (
              <div className="sm:col-span-3 text-sm text-red-600">{error}</div>
            )}
          </form>
        </Section>
      </Card>

      <Card>
        <Section title="Existing Tax Classes">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Rate</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4">{t.name}</td>
                    <td className="py-2 pr-4">{formatPercent(t.rate)}</td>
                    <td className="py-2 pr-4">
                      <Badge active={t.is_active} />
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => edit(t.id, t.name, t.rate)}
                          disabled={loading}
                          ariaLabel="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => toggle(t.id, !t.is_active)}
                          disabled={loading}
                          ariaLabel={t.is_active ? "Deactivate" : "Activate"}
                        >
                          <PowerIcon className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {t.is_active ? "Deactivate" : "Activate"}
                          </span>
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => remove(t.id)}
                          disabled={loading}
                          ariaLabel="Delete"
                        >
                          <TrashIcon className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={4}>
                      No tax classes yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </Card>
    </div>
  );
}

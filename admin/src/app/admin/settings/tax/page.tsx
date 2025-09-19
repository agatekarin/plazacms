"use client";
import * as React from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import TaxClassesManager from "../tax-classes/TaxClassesManager";

export const dynamic = "force-dynamic";

interface TaxClassRow {
  id: string;
  name: string;
  rate: string; // numeric comes back as string from pg
  is_active: boolean;
}

export default function TaxSettingsPage() {
  const [items, setItems] = React.useState<TaxClassRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { apiCallJson } = useAuthenticatedFetch();

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = (await apiCallJson("/api/admin/tax-classes")) as {
          items: TaxClassRow[];
        };
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Failed to load tax classes"
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="p-4">Loading tax settings...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tax Settings</h1>
      </div>
      <TaxClassesManager initialItems={items ?? []} />
    </div>
  );
}

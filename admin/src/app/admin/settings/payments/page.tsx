"use client";
import * as React from "react";
import PaymentsManager, { PaymentGatewayRow } from "./PaymentsManager";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

export const dynamic = "force-dynamic";

export default function PaymentsSettingsPage() {
  const [gateways, setGateways] = React.useState<PaymentGatewayRow[] | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { apiCallJson } = useAuthenticatedFetch();

  React.useEffect(() => {
    let cancelled = false;
    const fetchGateways = async () => {
      try {
        setLoading(true);
        const data = (await apiCallJson("/api/admin/payments/gateways")) as {
          items: PaymentGatewayRow[];
        };
        if (!cancelled) setGateways(data.items);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load gateways");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchGateways();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="p-4">Loading payment gateways...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }
  return (
    <div className="space-y-6">
      <PaymentsManager initialGateways={gateways ?? []} />
    </div>
  );
}

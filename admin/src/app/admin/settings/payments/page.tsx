"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, User } from "@/lib/auth";
import { useRouter } from "next/navigation";
import PaymentsManager, { PaymentGatewayRow } from "./PaymentsManager";

export default function PaymentsSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<PaymentGatewayRow[]>([]);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "admin") {
          router.push("/signin");
          return;
        }
        setUser(currentUser);

        // TODO: Load payment gateways from Hono API
        // For now, use empty array until API is implemented
        setGateways([]);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <div className="space-y-6">
      <PaymentsManager initialGateways={gateways} />
    </div>
  );
}

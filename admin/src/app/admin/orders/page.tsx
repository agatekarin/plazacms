"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import OrdersManager from "./OrdersManager";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const status = searchParams?.get("status") || "";

  return (
    <PageContainer
      title="Orders Management"
      description="Manage all orders, track status, and handle fulfillment"
    >
      <OrdersManager initialStatus={status} />
    </PageContainer>
  );
}

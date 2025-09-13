"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import RefundsManager from "./RefundsManager";

export default function RefundsPage() {
  return (
    <PageContainer
      title="Refunds Management"
      description="Track and manage all payment refunds"
      breadcrumbs={[
        { label: "Transactions", href: "/admin/transactions" },
        { label: "Refunds", href: "/admin/transactions/refunds" },
      ]}
    >
      <RefundsManager />
    </PageContainer>
  );
}

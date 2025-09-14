"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import PageContainer from "@/components/PageContainer";
import TransactionsManager from "./TransactionsManager";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const status = searchParams?.get("status") || "";

  return (
    <PageContainer
      title="Transactions Management"
      description="Monitor payment transactions, handle refunds, and track payment statuses"
    >
      <TransactionsManager initialStatus={status} />
    </PageContainer>
  );
}

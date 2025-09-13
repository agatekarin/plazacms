"use client";

import { use } from "react";
import PageContainer from "@/components/PageContainer";
import TransactionDetail from "./TransactionDetail";

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { id } = use(params);

  return (
    <PageContainer
      title="Transaction Details"
      description="View transaction information and manage refunds"
      breadcrumbs={[
        { label: "Transactions", href: "/admin/transactions" },
        {
          label: `Transaction ${id.slice(-8)}`,
          href: `/admin/transactions/${id}`,
        },
      ]}
    >
      <TransactionDetail transactionId={id} />
    </PageContainer>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import PageContainer from "@/components/PageContainer";
import OrderDetail from "./OrderDetail";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <PageContainer
      title="Order Details"
      description="View and manage order information"
      breadcrumbs={[
        { label: "Orders", href: "/admin/orders" },
        { label: `Order #${id}`, href: `/admin/orders/${id}` },
      ]}
    >
      <OrderDetail orderId={id} />
    </PageContainer>
  );
}

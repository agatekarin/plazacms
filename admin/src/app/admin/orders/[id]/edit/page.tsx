"use client";

import { use } from "react";
import PageContainer from "@/components/PageContainer";
import OrderEditor from "./OrderEditor";

interface OrderEditPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderEditPage({ params }: OrderEditPageProps) {
  const { id } = use(params);

  return (
    <PageContainer
      title="Edit Order"
      description="Modify order details, status, and items"
      breadcrumbs={[
        { label: "Orders", href: "/admin/orders" },
        { label: `Order #${id}`, href: `/admin/orders/${id}` },
        { label: "Edit", href: `/admin/orders/${id}/edit` },
      ]}
    >
      <OrderEditor orderId={id} />
    </PageContainer>
  );
}

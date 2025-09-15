"use client";

import PageContainer from "@/components/PageContainer";
import AttributesManager from "./AttributesManager";

export default function AttributesPage() {
  return (
    <PageContainer
      title="Attributes"
      description="Define product attributes and manage their values"
    >
      <AttributesManager />
    </PageContainer>
  );
}

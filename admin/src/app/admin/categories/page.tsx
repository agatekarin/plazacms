"use client";

import PageContainer from "@/components/PageContainer";
import CategoriesManager from "./CategoriesManager";

export default function CategoriesPage() {
  return (
    <PageContainer
      title="Categories"
      description="Organize your products into categories"
    >
      <CategoriesManager />
    </PageContainer>
  );
}

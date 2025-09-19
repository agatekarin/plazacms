"use client";

import { useParams } from "next/navigation";
import { ReviewList } from "@/components/ReviewList";
import PageContainer from "@/components/PageContainer";

export default function ProductReviewsPage() {
  const params = useParams();
  const productId = params.productId as string;

  return (
    <PageContainer>
      <ReviewList
        productId={productId}
        showFilters={true}
        showPagination={true}
        itemsPerPage={10}
      />
    </PageContainer>
  );
}

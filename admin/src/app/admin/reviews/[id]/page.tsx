"use client";

import { useParams, useRouter } from "next/navigation";
import { ReviewDetail } from "@/components/ReviewDetail";
import PageContainer from "@/components/PageContainer";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;

  const handleBack = () => {
    router.push("/admin/reviews");
  };

  const handleReviewUpdated = () => {
    // Optionally refresh the reviews list or show a success message
    console.log("Review updated successfully");
  };

  return (
    <PageContainer>
      <ReviewDetail
        reviewId={reviewId}
        onBack={handleBack}
        onReviewUpdated={handleReviewUpdated}
      />
    </PageContainer>
  );
}

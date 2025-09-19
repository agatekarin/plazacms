"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

export default function ReviewSubmissionPage() {
  const searchParams = useSearchParams();
  const [productInfo, setProductInfo] = useState<{
    id: string;
    name: string;
    image?: string;
  } | null>(null);

  const productId = searchParams.get("product_id");
  const orderId = searchParams.get("order_id");
  const orderItemId = searchParams.get("order_item_id");

  // Fetch product info
  useEffect(() => {
    const fetchProductInfo = async () => {
      if (productId) {
        try {
          // Fetch product details from API
          const response = await fetch(`/api/admin/products/${productId}`);
          if (response.ok) {
            const data = await response.json();
            setProductInfo({
              id: data.item.id,
              name: data.item.name,
              image: data.item.featured_image_url || "/placeholder-product.jpg",
            });
          } else {
            // Fallback to sample data if API fails
            setProductInfo({
              id: productId,
              name: "Product",
              image: "/placeholder-product.jpg",
            });
          }
        } catch (error) {
          console.error("Error fetching product info:", error);
          // Fallback to sample data
          setProductInfo({
            id: productId,
            name: "Product",
            image: "/placeholder-product.jpg",
          });
        }
      }
    };

    fetchProductInfo();
  }, [productId]);

  const handleReviewSubmitted = (review: any) => {
    console.log("Review submitted:", review);
    // Redirect to product page or show success message
  };

  if (!productId) {
    return (
      <PageContainer>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Product Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              Please select a product to review.
            </p>
            <Button asChild>
              <Link href="/admin/products">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Write a Review</h1>
            <p className="text-gray-600">
              Share your experience with this product
            </p>
          </div>
        </div>

        {/* Review Form */}
        {productInfo && (
          <ReviewForm
            productId={productInfo.id}
            productName={productInfo.name}
            productImage={productInfo.image}
            orderId={orderId || undefined}
            orderItemId={orderItemId || undefined}
            onReviewSubmitted={handleReviewSubmitted}
          />
        )}
      </div>
    </PageContainer>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ReviewRating } from "./ReviewRating";
import { ReviewImageUpload } from "./ReviewImageUpload";
import {
  Star,
  Upload,
  Image as ImageIcon,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  Package,
  ShoppingCart,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  productId: string;
  productName: string;
  productImage?: string;
  orderId?: string;
  orderItemId?: string;
  orderItemName?: string;
  onReviewSubmitted?: (review: any) => void;
  className?: string;
}

interface ReviewFormData {
  rating: number;
  title: string;
  comment: string;
  images: Array<{
    media_id: string;
    display_order: number;
    url: string;
    alt_text?: string;
  }>;
}

export function ReviewForm({
  productId,
  productName,
  productImage,
  orderId,
  orderItemId,
  orderItemName,
  onReviewSubmitted,
  className,
}: ReviewFormProps) {
  const { apiCallJson, uploadWithProgress } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to submit review");
    },
  });

  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 0,
    title: "",
    comment: "",
    images: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle rating change
  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: "" }));
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Handle images change
  const handleImagesChange = (images: any[]) => {
    setFormData((prev) => ({ ...prev, images }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.rating === 0) {
      newErrors.rating = "Please select a rating";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Please enter a review title";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (!formData.comment.trim()) {
      newErrors.comment = "Please write a review comment";
    } else if (formData.comment.trim().length < 10) {
      newErrors.comment = "Comment must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setSubmitProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const reviewData = {
        product_id: productId,
        order_id: orderId,
        order_item_id: orderItemId,
        rating: formData.rating,
        title: formData.title.trim(),
        comment: formData.comment.trim(),
        is_verified_purchase: !!orderId,
      };

      const response = await apiCallJson("/api/customer/reviews", {
        method: "POST",
        body: JSON.stringify(reviewData),
      });

      // Upload images if any
      if (formData.images.length > 0) {
        for (const image of formData.images) {
          // Images are already uploaded via ReviewImageUpload component
          // Just associate them with the review
          await apiCallJson(`/api/customer/reviews/${response.id}/images`, {
            method: "POST",
            body: JSON.stringify({
              media_id: image.media_id,
              display_order: image.display_order,
            }),
          });
        }
      }

      setSubmitProgress(100);
      setIsSubmitted(true);
      toast.success("Review submitted successfully!");

      onReviewSubmitted?.(response);

      // Reset form after delay
      setTimeout(() => {
        setFormData({
          rating: 0,
          title: "",
          comment: "",
          images: [],
        });
        setIsSubmitted(false);
        setSubmitProgress(0);
      }, 3000);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      rating: 0,
      title: "",
      comment: "",
      images: [],
    });
    setErrors({});
    setIsSubmitted(false);
    setSubmitProgress(0);
  };

  if (isSubmitted) {
    return (
      <Card className={cn("max-w-2xl mx-auto", className)}>
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Review Submitted Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            Thank you for your review. It will be published after moderation.
          </p>
          <Button onClick={handleReset} variant="outline">
            Write Another Review
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Star className="w-5 h-5" />
          Write a Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Info */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          {productImage && (
            <div className="w-16 h-16 rounded-lg overflow-hidden border">
              <img
                src={productImage}
                alt={productName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{productName}</h4>
            {orderItemName && orderItemName !== productName && (
              <p className="text-sm text-gray-600">{orderItemName}</p>
            )}
            {orderId && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                Verified Purchase
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Rating <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <ReviewRating
                rating={formData.rating}
                interactive={true}
                onRatingChange={handleRatingChange}
                size="lg"
                showNumber
              />
              {formData.rating > 0 && (
                <span className="text-sm text-gray-600">
                  {formData.rating === 1 && "Poor"}
                  {formData.rating === 2 && "Fair"}
                  {formData.rating === 3 && "Good"}
                  {formData.rating === 4 && "Very Good"}
                  {formData.rating === 5 && "Excellent"}
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Review Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Summarize your review in a few words..."
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className={cn(errors.title && "border-red-500")}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Your Review <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this product..."
              value={formData.comment}
              onChange={(e) => handleInputChange("comment", e.target.value)}
              rows={6}
              className={cn(errors.comment && "border-red-500")}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Minimum 10 characters</span>
              <span>{formData.comment.length} characters</span>
            </div>
            {errors.comment && (
              <p className="text-sm text-red-600">{errors.comment}</p>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Photos (Optional)</Label>
            <ReviewImageUpload
              reviewId="temp" // Will be updated after review creation
              existingImages={formData.images}
              maxImages={5}
              onImagesChange={handleImagesChange}
            />
            <p className="text-xs text-gray-500">
              Add photos to help other customers see what you received
            </p>
          </div>

          {/* Submit Progress */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Submitting review...</span>
                <span>{submitProgress}%</span>
              </div>
              <Progress value={submitProgress} className="h-2" />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Reset
            </Button>
          </div>
        </form>

        {/* Guidelines */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Review Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be honest and specific about your experience</li>
            <li>• Focus on the product and your experience with it</li>
            <li>• Avoid personal information or inappropriate content</li>
            <li>• Reviews are moderated before being published</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

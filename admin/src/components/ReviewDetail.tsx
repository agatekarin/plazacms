"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ReviewRating } from "./ReviewRating";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Image as ImageIcon,
  Calendar,
  ThumbsUp,
  MessageSquare,
  Package,
  ShoppingCart,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Flag,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ReviewDetailProps {
  reviewId: string;
  onBack?: () => void;
  onReviewUpdated?: () => void;
  className?: string;
}

interface ReviewDetail {
  id: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  moderation_status: "pending" | "approved" | "rejected" | "flagged";
  is_verified_purchase: boolean;
  helpful_count: number;
  admin_response?: string;
  moderation_notes?: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  order_id?: string;
  order_number?: string;
  order_item_id?: string;
  order_item_name?: string;
  order_item_price?: number;
  order_item_quantity?: number;
  images: Array<{
    media_id: string;
    display_order: number;
    url: string;
    alt_text?: string;
  }>;
}

export function ReviewDetail({
  reviewId,
  onBack,
  onReviewUpdated,
  className,
}: ReviewDetailProps) {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load review details");
    },
  });

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [moderationNotes, setModerationNotes] = useState("");
  const [showAdminResponse, setShowAdminResponse] = useState(false);
  const [showModerationNotes, setShowModerationNotes] = useState(false);

  // Fetch review details
  const fetchReviewDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(`/api/admin/reviews/${reviewId}`);
      setReview(data);
      setAdminResponse(data.admin_response || "");
      setModerationNotes(data.moderation_notes || "");
    } catch (error) {
      console.error("Error fetching review details:", error);
      toast.error("Failed to load review details");
    } finally {
      setLoading(false);
    }
  }, [apiCallJson, reviewId]);

  useEffect(() => {
    fetchReviewDetails();
  }, [fetchReviewDetails]);

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!review) return;

    try {
      setSaving(true);
      await apiCallJson(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          moderation_notes: moderationNotes,
        }),
      });

      toast.success(`Review ${newStatus} successfully`);
      fetchReviewDetails();
      onReviewUpdated?.();
    } catch (error) {
      toast.error(`Failed to ${newStatus} review`);
    } finally {
      setSaving(false);
    }
  };

  // Handle admin response
  const handleSaveAdminResponse = async () => {
    if (!review) return;

    try {
      setSaving(true);
      await apiCallJson(`/api/admin/reviews/${reviewId}/response`, {
        method: "POST",
        body: JSON.stringify({
          admin_response: adminResponse,
        }),
      });

      toast.success("Admin response saved successfully");
      fetchReviewDetails();
      setShowAdminResponse(false);
    } catch (error) {
      toast.error("Failed to save admin response");
    } finally {
      setSaving(false);
    }
  };

  // Handle moderation notes
  const handleSaveModerationNotes = async () => {
    if (!review) return;

    try {
      setSaving(true);
      await apiCallJson(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({
          moderation_notes: moderationNotes,
        }),
      });

      toast.success("Moderation notes saved successfully");
      fetchReviewDetails();
      setShowModerationNotes(false);
    } catch (error) {
      toast.error("Failed to save moderation notes");
    } finally {
      setSaving(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "hidden":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700">
            <EyeOff className="w-3 h-3 mr-1" />
            Hidden
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get moderation status badge
  const getModerationBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <Shield className="w-3 h-3 mr-1" />
            Mod Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <Shield className="w-3 h-3 mr-1" />
            Mod Rejected
          </Badge>
        );
      case "flagged":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            <Flag className="w-3 h-3 mr-1" />
            Flagged
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            <Shield className="w-3 h-3 mr-1" />
            Mod Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-8 text-gray-500">Review not found</div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Details</h1>
            <p className="text-gray-600">Review ID: {review.id}</p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {review.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => handleStatusChange("approved")}
              disabled={saving}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          )}
          {review.status !== "rejected" && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleStatusChange("rejected")}
              disabled={saving}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          )}
          {review.status !== "hidden" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("hidden")}
              disabled={saving}
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Hide
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Review Content</CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(review.status)}
                  {review.moderation_status !== review.status &&
                    getModerationBadge(review.moderation_status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating */}
              <div className="flex items-center gap-2">
                <ReviewRating rating={review.rating} size="lg" showNumber />
                {review.is_verified_purchase && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <User className="w-3 h-3 mr-1" />
                    Verified Purchase
                  </Badge>
                )}
              </div>

              {/* Comment */}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Customer Comment
                </Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-800 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>

              {/* Images */}
              {review.images.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Review Images ({review.images.length})
                  </Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {review.images
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((image) => (
                        <div
                          key={image.media_id}
                          className="relative aspect-square rounded-lg overflow-hidden border"
                        >
                          <OptimizedImage
                            src={image.url}
                            alt={image.alt_text || "Review image"}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Response */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Admin Response
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminResponse(!showAdminResponse)}
                >
                  {showAdminResponse ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAdminResponse ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Write your response to the customer..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={4}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveAdminResponse}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Response
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdminResponse(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : review.admin_response ? (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {review.admin_response}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No admin response yet. Click &ldquo;Edit&rdquo; to add one.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Product Name
                </Label>
                <p className="text-sm text-gray-900">{review.product_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Product ID
                </Label>
                <p className="text-sm text-gray-600 font-mono">
                  {review.product_id}
                </p>
              </div>
              {review.product_image && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Product Image
                  </Label>
                  <div className="mt-1 w-20 h-20 rounded-lg overflow-hidden border">
                    <OptimizedImage
                      src={review.product_image}
                      alt={review.product_name}
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {review.user_name && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Name
                  </Label>
                  <p className="text-sm text-gray-900">{review.user_name}</p>
                </div>
              )}
              {review.user_email && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {review.user_email}
                  </p>
                </div>
              )}
              {review.user_phone && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Phone
                  </Label>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {review.user_phone}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Customer ID
                </Label>
                <p className="text-sm text-gray-600 font-mono">
                  {review.user_id}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Info */}
          {review.order_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Order Number
                  </Label>
                  <p className="text-sm text-gray-900">
                    #{review.order_number}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Order ID
                  </Label>
                  <p className="text-sm text-gray-600 font-mono">
                    {review.order_id}
                  </p>
                </div>
                {review.order_item_name && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Item Name
                    </Label>
                    <p className="text-sm text-gray-900">
                      {review.order_item_name}
                    </p>
                  </div>
                )}
                {review.order_item_price && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Item Price
                    </Label>
                    <p className="text-sm text-gray-900">
                      ${review.order_item_price.toFixed(2)}
                    </p>
                  </div>
                )}
                {review.order_item_quantity && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Quantity
                    </Label>
                    <p className="text-sm text-gray-900">
                      {review.order_item_quantity}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ThumbsUp className="w-5 h-5" />
                Review Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Helpful Votes
                </Label>
                <p className="text-sm text-gray-900">
                  {review.helpful_count} votes
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Created
                </Label>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(review.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {review.updated_at !== review.created_at && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Last Updated
                  </Label>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(review.updated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Moderation Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Moderation Notes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModerationNotes(!showModerationNotes)}
                >
                  {showModerationNotes ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showModerationNotes ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add moderation notes..."
                    value={moderationNotes}
                    onChange={(e) => setModerationNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveModerationNotes}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Notes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowModerationNotes(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : review.moderation_notes ? (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r-md">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {review.moderation_notes}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No moderation notes yet. Click &ldquo;Edit&rdquo; to add some.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

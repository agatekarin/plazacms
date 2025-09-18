"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewRating } from "./ReviewRating";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Image as ImageIcon,
  Calendar,
  ThumbsUp,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string;
    status: "pending" | "approved" | "rejected" | "hidden";
    moderation_status: "pending" | "approved" | "rejected" | "flagged";
    is_verified_purchase: boolean;
    helpful_count: number;
    admin_response?: string;
    created_at: string;
    updated_at: string;
    product_name: string;
    product_slug: string;
    user_name?: string;
    user_email?: string;
    order_number?: string;
    order_item_name?: string;
    image_count: number;
  };
  showActions?: boolean;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
  onViewDetails?: (reviewId: string) => void;
  className?: string;
}

export function ReviewCard({
  review,
  showActions = true,
  onApprove,
  onReject,
  onViewDetails,
  className,
}: ReviewCardProps) {
  // Get status badge variant
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
            Mod Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Mod Rejected
          </Badge>
        );
      case "flagged":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Flagged
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            Mod Pending
          </Badge>
        );
    }
  };

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              {/* Rating and Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <ReviewRating rating={review.rating} size="sm" showNumber />
                {getStatusBadge(review.status)}
                {review.moderation_status !== review.status &&
                  getModerationBadge(review.moderation_status)}
              </div>

              {/* Product Info */}
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {review.product_name}
                </span>
                {review.order_item_name &&
                  review.order_item_name !== review.product_name && (
                    <span className="text-gray-600">
                      {" "}
                      • {review.order_item_name}
                    </span>
                  )}
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewDetails && (
                    <DropdownMenuItem onClick={() => onViewDetails(review.id)}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onApprove && review.status !== "approved" && (
                    <DropdownMenuItem onClick={() => onApprove(review.id)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                  )}
                  {onReject && review.status !== "rejected" && (
                    <DropdownMenuItem onClick={() => onReject(review.id)}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* User Info and Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {review.user_name && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <User className="w-3 h-3" />
                <span>{review.user_name}</span>
              </div>
            )}

            {review.is_verified_purchase && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                <User className="w-3 h-3 mr-1" />
                Verified Purchase
              </Badge>
            )}

            {review.image_count > 0 && (
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                {review.image_count} image{review.image_count > 1 ? "s" : ""}
              </Badge>
            )}

            {review.order_number && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                Order #{review.order_number}
              </Badge>
            )}
          </div>

          {/* Comment */}
          <div className="text-gray-800">
            <p className="line-clamp-3 leading-relaxed">{review.comment}</p>
          </div>

          {/* Admin Response */}
          {review.admin_response && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Admin Response:
                  </p>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {review.admin_response}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(review.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>

              {review.helpful_count > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {review.helpful_count} helpful
                </span>
              )}
            </div>

            {review.updated_at !== review.created_at && (
              <span className="text-gray-400">
                Updated {new Date(review.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

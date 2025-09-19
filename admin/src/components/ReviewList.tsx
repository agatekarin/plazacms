"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewCard } from "./ReviewCard";
import { ReviewPagination } from "./ReviewPagination";
import { ReviewRating } from "./ReviewRating";
import { ReviewImages } from "./ReviewImages";
import { ReviewHelpful } from "./ReviewHelpful";
import {
  Star,
  Filter,
  SortAsc,
  MessageSquare,
  ThumbsUp,
  Image as ImageIcon,
  User,
  Calendar,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ReviewListProps {
  productId: string;
  showFilters?: boolean;
  showPagination?: boolean;
  itemsPerPage?: number;
  className?: string;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  is_verified_purchase: boolean;
  helpful_count: number;
  admin_response?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  order_number?: string;
  order_item_name?: string;
  images: Array<{
    media_id: string;
    display_order: number;
    url: string;
    alt_text?: string;
  }>;
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
}

export function ReviewList({
  productId,
  showFilters = true,
  showPagination = true,
  itemsPerPage = 10,
  className,
}: ReviewListProps) {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load reviews");
    },
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: itemsPerPage,
  });
  const [filters, setFilters] = useState({
    rating: "all",
    sort: "newest",
    verified_only: false,
  });
  const [loading, setLoading] = useState(true);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current_page.toString(),
        per_page: pagination.per_page.toString(),
        rating: filters.rating,
        sort: filters.sort,
        verified_only: filters.verified_only.toString(),
      }).toString();

      const response = await apiCallJson(
        `/api/customer/reviews/product/${productId}?${queryParams}`
      );

      setReviews(response.data || []);
      setPagination(
        response.meta || {
          current_page: 1,
          total_pages: 1,
          total_items: 0,
          per_page: itemsPerPage,
        }
      );
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [
    apiCallJson,
    productId,
    pagination.current_page,
    pagination.per_page,
    filters,
  ]);

  // Fetch review stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await apiCallJson(
        `/api/customer/reviews/product/${productId}/stats`
      );
      setStats(data);
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  }, [apiCallJson, productId]);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [fetchReviews, fetchStats]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, current_page: page }));
  };

  // Handle items per page change
  const handleItemsPerPageChange = (perPage: number) => {
    setPagination((prev) => ({ ...prev, per_page: perPage, current_page: 1 }));
  };

  // Calculate rating percentage
  const getRatingPercentage = (rating: number): number => {
    if (!stats || stats.total_reviews === 0) return 0;
    return (
      (stats.rating_distribution[
        String(rating) as keyof typeof stats.rating_distribution
      ] /
        stats.total_reviews) *
      100
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Review Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5" />
              Customer Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stats.average_rating.toFixed(1)}
                </div>
                <ReviewRating
                  rating={Math.round(stats.average_rating)}
                  size="lg"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Based on {stats.total_reviews} review
                  {stats.total_reviews !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const percentage = getRatingPercentage(rating);
                  const count =
                    stats.rating_distribution[
                      String(rating) as keyof typeof stats.rating_distribution
                    ];

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filter by:</span>
              </div>

              <Select
                value={filters.rating}
                onValueChange={(value) => handleFilterChange("rating", value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sort}
                onValueChange={(value) => handleFilterChange("sort", value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Rating</SelectItem>
                  <SelectItem value="lowest">Lowest Rating</SelectItem>
                  <SelectItem value="most_helpful">Most Helpful</SelectItem>
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.verified_only}
                  onChange={(e) =>
                    handleFilterChange("verified_only", e.target.checked)
                  }
                  className="rounded border-gray-300"
                />
                Verified purchases only
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reviews yet
              </h3>
              <p className="text-gray-600">
                Be the first to review this product!
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ReviewRating
                          rating={review.rating}
                          size="sm"
                          showNumber
                        />
                        <h4 className="font-medium text-gray-900">
                          {review.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{review.user_name || "Anonymous"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.is_verified_purchase && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Verified Purchase</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="text-gray-800 leading-relaxed">
                    <p>{review.comment}</p>
                  </div>

                  {/* Review Images */}
                  {review.images.length > 0 && (
                    <ReviewImages images={review.images} />
                  )}

                  {/* Admin Response */}
                  {review.admin_response && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800 mb-1">
                            Store Response:
                          </p>
                          <p className="text-sm text-blue-700 leading-relaxed">
                            {review.admin_response}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Helpful Votes */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <ReviewHelpful
                      reviewId={review.id}
                      helpfulCount={review.helpful_count}
                    />
                    {review.order_number && (
                      <span className="text-xs text-gray-500">
                        Order #{review.order_number}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {showPagination && pagination.total_pages > 1 && (
        <ReviewPagination
          currentPage={pagination.current_page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total_items}
          itemsPerPage={pagination.per_page}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}

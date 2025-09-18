"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed unused imports
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import toast from "react-hot-toast";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  ThumbsUp,
  Image,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewAnalytics {
  total_reviews: number;
  average_rating: number;
  approval_rate: number;
  total_helpful_votes: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  status_distribution: {
    pending: number;
    approved: number;
    rejected: number;
  };
  verified_purchase_percentage: number;
  with_images_percentage: number;
  with_admin_response_percentage: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    review_count: number;
    average_rating: number;
  }>;
  top_reviewers: Array<{
    user_id: string;
    user_email: string;
    review_count: number;
    average_rating: number;
  }>;
  monthly_trends: Array<{
    month: string;
    reviews_count: number;
    average_rating: number;
  }>;
}

interface ReviewAnalyticsProps {
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

export function ReviewAnalytics({
  timeRange = "30d",
  onTimeRangeChange,
}: ReviewAnalyticsProps) {
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      toast.error(error?.message || "Failed to load analytics");
    },
  });

  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [productId, setProductId] = useState<string>("");

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period: selectedTimeRange,
        ...(productId && { product_id: productId }),
      }).toString();
      const data = await apiCallJson(`/api/admin/reviews/analytics?${params}`);
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [apiCallJson, selectedTimeRange, productId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    onTimeRangeChange?.(range);
  };

  const getRatingPercentage = (rating: number): number => {
    if (!analytics || analytics.total_reviews === 0) return 0;
    return (
      (analytics.rating_distribution[
        String(rating) as keyof typeof analytics.rating_distribution
      ] /
        analytics.total_reviews) *
      100
    );
  };

  const getStatusPercentage = (
    status: "pending" | "approved" | "rejected"
  ): number => {
    if (!analytics || analytics.total_reviews === 0) return 0;
    return (
      (analytics.status_distribution[status] / analytics.total_reviews) * 100
    );
  };

  // Removed unused getTrendIcon function

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analytics Data
        </h3>
        <p className="text-gray-600">
          Analytics data will appear once you have reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Analytics</h2>
          <p className="text-gray-600">
            Insights and statistics for your product reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <input
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Product ID (optional)"
            className="h-9 px-3 border rounded-md text-sm"
          />
          <Select
            value={selectedTimeRange}
            onValueChange={handleTimeRangeChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Reviews
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.total_reviews.toLocaleString()}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Rating
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.average_rating.toFixed(1)}
                  </p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.round(analytics.average_rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Approval Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.approval_rate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Helpful Votes
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.total_helpful_votes.toLocaleString()}
                </p>
              </div>
              <ThumbsUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const percentage = getRatingPercentage(rating);
              const count =
                analytics.rating_distribution[
                  String(rating) as keyof typeof analytics.rating_distribution
                ];

              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.status_distribution.pending}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage("pending").toFixed(1)}% of total
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.status_distribution.approved}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage("approved").toFixed(1)}% of total
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.status_distribution.rejected}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusPercentage("rejected").toFixed(1)}% of total
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Verified Purchases
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.verified_purchase_percentage.toFixed(1)}%
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Images</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.with_images_percentage.toFixed(1)}%
                </p>
              </div>
              <Image className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Admin Responses
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.with_admin_response_percentage.toFixed(1)}%
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Top Products by Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.top_products.slice(0, 5).map((product, index) => (
              <div
                key={product.product_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {product.product_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < Math.round(product.average_rating)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {product.average_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {product.review_count} reviews
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Reviewers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Active Reviewers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.top_reviewers.slice(0, 5).map((reviewer, index) => (
              <div
                key={reviewer.user_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {reviewer.user_email}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < Math.round(reviewer.average_rating)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {reviewer.average_rating.toFixed(1)} avg
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {reviewer.review_count} reviews
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.monthly_trends.slice(0, 6).map((trend) => (
              <div
                key={trend.month}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-600 w-20">
                    {trend.month}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-400 h-2 rounded-full"
                          style={{
                            width: `${
                              (trend.reviews_count /
                                Math.max(
                                  ...analytics.monthly_trends.map(
                                    (t) => t.reviews_count
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {trend.reviews_count}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < Math.round(trend.average_rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {trend.average_rating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

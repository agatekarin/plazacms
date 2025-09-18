"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  ThumbsUp,
  MessageSquare,
  Users,
  Package,
  Calendar,
  Filter,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import toast from "react-hot-toast";

interface ReviewAnalytics {
  total_reviews: number;
  average_rating: number;
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
    hidden: number;
  };
  verified_purchase_percentage: number;
  reviews_with_images_percentage: number;
  helpful_votes_total: number;
  reviews_with_admin_response_percentage: number;
  recent_trends: {
    period: string;
    total_reviews: number;
    average_rating: number;
    approval_rate: number;
  }[];
  top_products: Array<{
    product_id: string;
    product_name: string;
    review_count: number;
    average_rating: number;
  }>;
  top_reviewers: Array<{
    user_id: string;
    user_name: string;
    review_count: number;
    average_rating: number;
  }>;
}

export default function ReviewAnalyticsPage() {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load analytics");
    },
  });

  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(
        `/api/admin/reviews/analytics?period=${timeRange}`
      );
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [apiCallJson, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  if (!analytics) {
    return (
      <PageContainer>
        <div className="text-center py-8 text-gray-500">
          No analytics data available
        </div>
      </PageContainer>
    );
  }

  // Calculate approval rate
  const approvalRate =
    analytics.total_reviews > 0
      ? (analytics.status_distribution.approved / analytics.total_reviews) * 100
      : 0;

  // Calculate trend indicators
  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) {
      return { icon: TrendingUp, color: "text-green-600", label: "up" };
    } else if (current < previous) {
      return { icon: TrendingDown, color: "text-red-600", label: "down" };
    }
    return { icon: TrendingUp, color: "text-gray-600", label: "stable" };
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Review Analytics
            </h1>
            <p className="text-gray-600">Review performance and insights</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
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
                <MessageSquare className="w-8 h-8 text-blue-600" />
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
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.average_rating.toFixed(1)}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-600" />
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
                    {approvalRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
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
                    {analytics.helpful_votes_total?.toLocaleString() || 0}
                  </p>
                </div>
                <ThumbsUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.rating_distribution)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([rating, count]) => {
                  const percentage =
                    analytics.total_reviews > 0
                      ? (count / analytics.total_reviews) * 100
                      : 0;

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {count}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.status_distribution).map(
                  ([status, count]) => {
                    const percentage =
                      analytics.total_reviews > 0
                        ? (count / analytics.total_reviews) * 100
                        : 0;

                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case "approved":
                          return "bg-green-500";
                        case "pending":
                          return "bg-yellow-500";
                        case "rejected":
                          return "bg-red-500";
                        case "hidden":
                          return "bg-gray-500";
                        default:
                          return "bg-gray-500";
                      }
                    };

                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(
                              status
                            )}`}
                          />
                          <span className="text-sm font-medium capitalize">
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{count}</span>
                          <span className="text-xs text-gray-500">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Verified Purchases
                  </span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {analytics.verified_purchase_percentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Reviews with Images
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-700"
                  >
                    {analytics.reviews_with_images_percentage?.toFixed(1) || 0}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Admin Responses</span>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    {analytics.reviews_with_admin_response_percentage?.toFixed(
                      1
                    ) || 0}
                    %
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top Reviewed Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_products.slice(0, 5).map((product, index) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {product.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {product.product_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {product.review_count} reviews
                      </p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">
                          {product.average_rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Reviewers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Most Active Reviewers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_reviewers.slice(0, 5).map((reviewer, index) => (
                <div
                  key={reviewer.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {reviewer.user_name || "Anonymous"}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {reviewer.user_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {reviewer.review_count} reviews
                      </p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">
                          {reviewer.average_rating.toFixed(1)} avg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

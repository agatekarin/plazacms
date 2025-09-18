"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewPagination } from "@/components/ReviewPagination";
import PageContainer from "@/components/PageContainer";
import {
  Search,
  Filter,
  Star,
  MessageSquare,
  Calendar,
  Package,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

interface ReviewHistory {
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
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image?: string;
  order_id?: string;
  order_number?: string;
  order_item_name?: string;
  images: Array<{
    media_id: string;
    display_order: number;
    url: string;
    alt_text?: string;
  }>;
}

export default function ReviewHistoryPage() {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load review history");
    },
  });

  const [reviews, setReviews] = useState<ReviewHistory[]>([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: 10,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    rating: "all",
    sort: "newest",
  });
  const [loading, setLoading] = useState(true);

  // Fetch review history
  const fetchReviewHistory = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current_page.toString(),
        per_page: pagination.per_page.toString(),
        search: filters.search,
        status: filters.status,
        rating: filters.rating,
        sort: filters.sort,
      }).toString();

      const response = await apiCallJson(
        `/api/customer/reviews/my?${queryParams}`
      );
      setReviews(response.data);
      setPagination(response.meta);
    } catch (error) {
      console.error("Error fetching review history:", error);
      toast.error("Failed to load review history");
    } finally {
      setLoading(false);
    }
  }, [apiCallJson, pagination.current_page, pagination.per_page, filters]);

  useEffect(() => {
    fetchReviewHistory();
  }, [fetchReviewHistory]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
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

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  if (loading && reviews.length === 0) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600">View and manage your product reviews</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search reviews..."
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <Select
                  value={filters.rating}
                  onValueChange={(value) => handleFilterChange("rating", value)}
                >
                  <SelectTrigger>
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
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select
                  value={filters.sort}
                  onValueChange={(value) => handleFilterChange("sort", value)}
                >
                  <SelectTrigger>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reviews found
                </h3>
                <p className="text-gray-600 mb-4">
                  {filters.search ||
                  filters.status !== "all" ||
                  filters.rating !== "all"
                    ? "Try adjusting your filters to see more reviews."
                    : "You haven't written any reviews yet."}
                </p>
                <Button asChild>
                  <a href="/admin/products">Browse Products</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={{
                  id: review.id,
                  rating: review.rating,
                  comment: review.comment,
                  status: review.status,
                  moderation_status:
                    review.status === "hidden" ? "flagged" : review.status,
                  is_verified_purchase: review.is_verified_purchase,
                  helpful_count: review.helpful_count,
                  admin_response: review.admin_response,
                  created_at: review.created_at,
                  updated_at: review.updated_at,
                  product_name: review.product_name,
                  product_slug: review.product_slug,
                  user_name: "You",
                  user_email: undefined,
                  order_number: review.order_number,
                  order_item_name: review.order_item_name,
                  image_count: review.images.length,
                }}
                showActions={false}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
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
    </PageContainer>
  );
}

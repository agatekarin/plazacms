"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Image as ImageIcon,
  User,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

// Types
interface Review {
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
}

interface ReviewFilters {
  search: string;
  status: string;
  rating: string;
  productId: string;
  userId: string;
  verifiedOnly: boolean;
  sortBy: string;
  sortOrder: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function ReviewManager() {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load reviews");
    },
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [filters, setFilters] = useState<ReviewFilters>({
    search: "",
    status: "all",
    rating: "all",
    productId: "",
    userId: "",
    verifiedOnly: false,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch reviews with current filters
  const fetchReviews = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status &&
          filters.status !== "all" && { status: filters.status }),
        ...(filters.rating &&
          filters.rating !== "all" && { rating: filters.rating }),
        ...(filters.productId && { product_id: filters.productId }),
        ...(filters.userId && { user_id: filters.userId }),
        ...(filters.verifiedOnly && { verified_only: "true" }),
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
      });

      const data = await apiCallJson(`/api/admin/reviews?${params}`);
      setReviews(data.reviews || []);
      setPagination((prev) => data.pagination || prev);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  }, [apiCallJson, pagination.page, pagination.limit, filters]);

  // Load reviews on mount and when filters change
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search !== "") {
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchReviews();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search, fetchReviews]);

  // Handle filter changes
  const handleFilterChange = (
    key: keyof ReviewFilters,
    value: string | boolean
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle review selection
  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews((prev) =>
      prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((review) => review.id));
    }
  };

  // Handle bulk actions
  const handleBulkApprove = async () => {
    if (selectedReviews.length === 0) return;

    try {
      const promises = selectedReviews.map((id) =>
        apiCallJson(`/api/admin/reviews/${id}/approve`, { method: "POST" })
      );

      await Promise.all(promises);
      toast.success(`${selectedReviews.length} reviews approved successfully`);
      setSelectedReviews([]);
      fetchReviews();
    } catch (error) {
      toast.error("Failed to approve reviews");
    }
  };

  const handleBulkReject = async () => {
    if (selectedReviews.length === 0) return;

    try {
      const promises = selectedReviews.map((id) =>
        apiCallJson(`/api/admin/reviews/${id}/reject`, {
          method: "POST",
          body: JSON.stringify({ moderation_notes: "Bulk rejection" }),
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedReviews.length} reviews rejected successfully`);
      setSelectedReviews([]);
      fetchReviews();
    } catch (error) {
      toast.error("Failed to reject reviews");
    }
  };

  // Handle individual review actions
  const handleApproveReview = async (reviewId: string) => {
    try {
      await apiCallJson(`/api/admin/reviews/${reviewId}/approve`, {
        method: "POST",
      });
      toast.success("Review approved successfully");
      fetchReviews();
    } catch (error) {
      toast.error("Failed to approve review");
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    try {
      await apiCallJson(`/api/admin/reviews/${reviewId}/reject`, {
        method: "POST",
        body: JSON.stringify({ moderation_notes: "Rejected by admin" }),
      });
      toast.success("Review rejected successfully");
      fetchReviews();
    } catch (error) {
      toast.error("Failed to reject review");
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Review Management
          </h1>
          <p className="text-gray-600">
            Manage customer reviews and moderation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
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
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
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
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
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
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ratings</SelectItem>
                    <SelectItem value="5">5 stars</SelectItem>
                    <SelectItem value="4">4 stars</SelectItem>
                    <SelectItem value="3">3 stars</SelectItem>
                    <SelectItem value="2">2 stars</SelectItem>
                    <SelectItem value="1">1 star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onValueChange={(value) => {
                    const [sortBy, sortOrder] = value.split("-");
                    handleFilterChange("sortBy", sortBy);
                    handleFilterChange("sortOrder", sortOrder);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at-desc">
                      Newest first
                    </SelectItem>
                    <SelectItem value="created_at-asc">Oldest first</SelectItem>
                    <SelectItem value="rating-desc">Highest rating</SelectItem>
                    <SelectItem value="rating-asc">Lowest rating</SelectItem>
                    <SelectItem value="helpful_count-desc">
                      Most helpful
                    </SelectItem>
                    <SelectItem value="product_name-asc">
                      Product A-Z
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedReviews.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedReviews.length} review(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleBulkApprove}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve All
                </Button>
                <Button size="sm" variant="danger" onClick={handleBulkReject}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Reviews ({pagination.total})
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedReviews.length === reviews.length &&
                  reviews.length > 0
                }
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reviews found
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedReviews.includes(review.id)}
                        onChange={() => handleSelectReview(review.id)}
                        className="mt-1 rounded border-gray-300"
                      />

                      <div className="flex-1 space-y-2">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {renderStars(review.rating)}
                          {getStatusBadge(review.status)}
                          {review.is_verified_purchase && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700"
                            >
                              <User className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {review.image_count > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700"
                            >
                              <ImageIcon className="w-3 h-3 mr-1" />
                              {review.image_count} image(s)
                            </Badge>
                          )}
                        </div>

                        {/* Product & User Info */}
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">
                            {review.product_name}
                          </span>
                          {review.user_name && (
                            <span> • by {review.user_name}</span>
                          )}
                          {review.order_number && (
                            <span> • Order #{review.order_number}</span>
                          )}
                        </div>

                        {/* Comment */}
                        <p className="text-gray-800 line-clamp-2">
                          {review.comment}
                        </p>

                        {/* Admin Response */}
                        {review.admin_response && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="text-sm font-medium text-blue-800">
                              Admin Response:
                            </p>
                            <p className="text-sm text-blue-700">
                              {review.admin_response}
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                          {review.helpful_count > 0 && (
                            <span>{review.helpful_count} helpful</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(`/admin/reviews/${review.id}`, "_blank")
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {review.status !== "approved" && (
                          <DropdownMenuItem
                            onClick={() => handleApproveReview(review.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {review.status !== "rejected" && (
                          <DropdownMenuItem
                            onClick={() => handleRejectReview(review.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
          >
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductSelector } from "@/components/ProductSelector";
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
  Trash2,
  MoreHorizontal,
  RotateCcw,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  product_id: string;
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editingReview, setEditingReview] = useState<
    | (Pick<Review, "id" | "rating" | "comment" | "created_at"> & {
        product_name: string;
      })
    | null
  >(null);

  const toInputDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${y}-${m}-${day}T${hh}:${mm}`;
    } catch {
      return "";
    }
  };

  const openEdit = (review: Review) => {
    setEditingReview({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      product_name: review.product_name,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingReview) return;
    try {
      setIsEditSaving(true);
      await apiCallJson(`/api/admin/reviews/${editingReview.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          rating: editingReview.rating,
          comment: editingReview.comment,
          created_at: new Date(editingReview.created_at).toISOString(),
        }),
      });
      toast.success("Review updated successfully");
      setIsEditOpen(false);
      setEditingReview(null);
      fetchReviews();
    } catch (e) {
      toast.error("Failed to update review");
      console.error("Edit error:", e);
    } finally {
      setIsEditSaving(false);
    }
  };

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
        ...(selectedProductIds.length > 0 && {
          product_ids: selectedProductIds.join(","),
        }),
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
      });

      const data = await apiCallJson(`/api/admin/reviews?${params}`);
      setReviews(data.reviews || []);
      setPagination((prev) => data.pagination || prev);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  }, [
    apiCallJson,
    pagination.page,
    pagination.limit,
    filters,
    selectedProductIds,
  ]);

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

  const handleBulkDelete = async () => {
    if (selectedReviews.length === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedReviews.length} reviews? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const promises = selectedReviews.map((id) =>
        apiCallJson(`/api/admin/reviews/${id}`, { method: "DELETE" })
      );

      await Promise.all(promises);
      toast.success(`${selectedReviews.length} reviews deleted successfully`);
      setSelectedReviews([]);
      fetchReviews();
    } catch (error) {
      toast.error("Failed to delete reviews");
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

  const handleDeleteReview = async (reviewId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this review? This action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
      await apiCallJson(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      toast.success("Review deleted successfully");
      fetchReviews();
    } catch (error) {
      toast.error("Failed to delete review");
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
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {/* Search */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search reviews..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Product Selector */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Products</label>
            <ProductSelector
              selectedProducts={selectedProductIds}
              onSelectionChange={setSelectedProductIds}
              placeholder="Filter by products..."
              className="w-full"
            />
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
                <SelectItem value="created_at-desc">Newest first</SelectItem>
                <SelectItem value="created_at-asc">Oldest first</SelectItem>
                <SelectItem value="rating-desc">Highest rating</SelectItem>
                <SelectItem value="rating-asc">Lowest rating</SelectItem>
                <SelectItem value="helpful_count-desc">Most helpful</SelectItem>
                <SelectItem value="product_name-asc">Product A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">&nbsp;</label>
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                setFilters({
                  search: "",
                  status: "all",
                  rating: "all",
                  productId: "",
                  userId: "",
                  verifiedOnly: false,
                  sortBy: "created_at",
                  sortOrder: "desc",
                });
                setSelectedProductIds([]);
              }}
              title="Reset all filters"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Reviews ({pagination.total})</h3>
          <div className="flex items-center gap-3">
            {/* Select All */}
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
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline cursor-pointer"
              >
                {selectedReviews.length > 0
                  ? `${selectedReviews.length} selected`
                  : "Select all"}
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedReviews.length > 0 && (
              <div className="flex items-center gap-2 border-l pl-3">
                <Button size="sm" variant="outline" onClick={handleBulkApprove}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkReject}>
                  <XCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedReviews([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No reviews found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedReviews.length === reviews.length &&
                        reviews.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-3 text-left">Product & Comment</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Rating</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Helpful</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b hover:bg-gray-50 align-top"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedReviews.includes(review.id)}
                        onChange={() => handleSelectReview(review.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">
                        {review.product_name}
                      </div>
                      {review.admin_response && (
                        <div className="mt-2 bg-blue-50 border-l-4 border-blue-400 p-2 rounded text-xs text-blue-700">
                          {review.admin_response}
                        </div>
                      )}
                      <div className="mt-1 text-gray-800 line-clamp-2">
                        {review.comment}
                      </div>
                    </td>
                    <td className="p-3">
                      {review.user_name || review.user_email || "-"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(review.status)}</td>
                    <td className="p-3">{review.helpful_count}</td>
                    <td className="p-3">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          type="button"
                          title="View Review"
                          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                          onClick={() =>
                            window.open(`/admin/reviews/${review.id}`, "_blank")
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="View Product"
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          onClick={() =>
                            window.open(
                              `/admin/products/${review.product_id}`,
                              "_blank"
                            )
                          }
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        {review.status !== "approved" && (
                          <button
                            type="button"
                            title="Approve Review"
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            onClick={() => handleApproveReview(review.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {review.status !== "rejected" && (
                          <button
                            type="button"
                            title="Reject Review"
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            onClick={() => handleRejectReview(review.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete Review"
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Review{" "}
              {editingReview?.product_name
                ? `for ${editingReview.product_name}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {editingReview && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <Select
                  value={String(editingReview.rating)}
                  onValueChange={(v) =>
                    setEditingReview({ ...editingReview, rating: Number(v) })
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Comment</label>
                <Textarea
                  value={editingReview.comment}
                  onChange={(e) =>
                    setEditingReview({
                      ...editingReview,
                      comment: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="datetime-local"
                  value={toInputDateTime(editingReview.created_at)}
                  onChange={(e) =>
                    setEditingReview({
                      ...editingReview,
                      created_at: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isEditSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={saveEdit}
              disabled={isEditSaving}
            >
              {isEditSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

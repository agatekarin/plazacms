"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import toast from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Users,
  Clock,
  Star,
} from "lucide-react";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  comment: string;
  status: "pending" | "approved" | "rejected";
  is_verified_purchase: boolean;
  helpful_count: number;
  admin_response?: string;
  moderation_status: "pending" | "approved" | "rejected";
  moderation_notes?: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
  user_email?: string;
}

interface ReviewModerationProps {
  reviews: Review[];
  onReviewsUpdated: () => void;
  selectedReviews: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function ReviewModeration({
  reviews,
  onReviewsUpdated,
  selectedReviews,
  onSelectionChange,
}: ReviewModerationProps) {
  const { apiCallJson, isLoading } = useAuthenticatedFetch({
    onError: (url, error) => {
      toast.error(error?.message || "Moderation action failed");
    },
  });

  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkNotes, setBulkNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectAll = useCallback(() => {
    if (selectedReviews.length === reviews.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(reviews.map((review) => review.id));
    }
  }, [selectedReviews.length, reviews.length, onSelectionChange, reviews]);

  const handleSelectReview = useCallback(
    (reviewId: string, checked: boolean) => {
      if (checked) {
        onSelectionChange([...selectedReviews, reviewId]);
      } else {
        onSelectionChange(selectedReviews.filter((id) => id !== reviewId));
      }
    },
    [selectedReviews, onSelectionChange]
  );

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedReviews.length === 0) {
      toast.error("Please select an action and reviews");
      return;
    }

    setIsProcessing(true);
    try {
      const promises = selectedReviews.map((reviewId) => {
        switch (bulkAction) {
          case "approve":
            return apiCallJson(`/api/admin/reviews/${reviewId}/approve`, {
              method: "POST",
              body: JSON.stringify({
                moderation_notes: bulkNotes || "Bulk approved",
              }),
            });
          case "reject":
            return apiCallJson(`/api/admin/reviews/${reviewId}/reject`, {
              method: "POST",
              body: JSON.stringify({
                moderation_notes: bulkNotes || "Bulk rejected",
              }),
            });
          case "delete":
            return apiCallJson(`/api/admin/reviews/${reviewId}`, {
              method: "DELETE",
            });
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);

      toast.success(`Successfully processed ${selectedReviews.length} reviews`);
      setBulkAction("");
      setBulkNotes("");
      onSelectionChange([]);
      onReviewsUpdated();
    } catch (error) {
      toast.error("Failed to process some reviews");
    } finally {
      setIsProcessing(false);
    }
  }, [
    bulkAction,
    selectedReviews,
    bulkNotes,
    apiCallJson,
    onSelectionChange,
    onReviewsUpdated,
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="danger">Rejected</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const selectedReviewsData = reviews.filter((review) =>
    selectedReviews.includes(review.id)
  );
  const pendingCount = selectedReviewsData.filter(
    (r) => r.status === "pending"
  ).length;
  const approvedCount = selectedReviewsData.filter(
    (r) => r.status === "approved"
  ).length;
  const rejectedCount = selectedReviewsData.filter(
    (r) => r.status === "rejected"
  ).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk Moderation
          {selectedReviews.length > 0 && (
            <Badge variant="outline">{selectedReviews.length} selected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedReviews.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {selectedReviews.length} reviews selected for bulk
              action.
              {pendingCount > 0 && ` ${pendingCount} pending,`}
              {approvedCount > 0 && ` ${approvedCount} approved,`}
              {rejectedCount > 0 && ` ${rejectedCount} rejected`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={
              selectedReviews.length === reviews.length && reviews.length > 0
            }
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            Select All ({reviews.length} reviews)
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-action">Bulk Action</Label>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Approve Reviews
                  </div>
                </SelectItem>
                <SelectItem value="reject">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Reject Reviews
                  </div>
                </SelectItem>
                <SelectItem value="delete">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Delete Reviews
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-notes">Moderation Notes (Optional)</Label>
            <Textarea
              id="bulk-notes"
              placeholder="Add notes for this bulk action..."
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleBulkAction}
            disabled={
              !bulkAction || selectedReviews.length === 0 || isProcessing
            }
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                Execute Bulk Action
              </>
            )}
          </Button>

          {selectedReviews.length > 0 && (
            <Button variant="outline" onClick={() => onSelectionChange([])}>
              Clear Selection
            </Button>
          )}
        </div>

        {selectedReviews.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Selected Reviews Preview:
            </Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedReviewsData.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center space-x-2 p-2 border rounded-lg"
                >
                  <Checkbox
                    checked={selectedReviews.includes(review.id)}
                    onCheckedChange={(checked: boolean) =>
                      handleSelectReview(review.id, checked)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(review.status)}
                      <span className="font-medium truncate">
                        {review.title}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{review.product_name}</span>
                      <span>•</span>
                      <span>{review.user_email}</span>
                      <span>•</span>
                      {getStatusBadge(review.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

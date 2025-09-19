"use client";

import { useState, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ReviewHelpfulProps {
  reviewId: string;
  helpfulCount: number;
  userVote?: "helpful" | "not_helpful" | null;
  onVoteChange?: (
    vote: "helpful" | "not_helpful" | null,
    newCount: number
  ) => void;
  className?: string;
}

export function ReviewHelpful({
  reviewId,
  helpfulCount,
  userVote = null,
  onVoteChange,
  className,
}: ReviewHelpfulProps) {
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to vote on review");
    },
  });

  const [isVoting, setIsVoting] = useState(false);
  const [currentVote, setCurrentVote] = useState<
    "helpful" | "not_helpful" | null
  >(userVote);
  const [currentCount, setCurrentCount] = useState(helpfulCount);

  // Handle vote
  const handleVote = useCallback(
    async (vote: "helpful" | "not_helpful") => {
      if (isVoting) return;

      try {
        setIsVoting(true);

        // If clicking the same vote, remove it
        if (currentVote === vote) {
          await apiCallJson(`/api/customer/reviews/${reviewId}/helpful`, {
            method: "DELETE",
            body: JSON.stringify({
              user_id: null, // TODO: Get from user context/auth when authentication is implemented
              ip_address: window?.location?.hostname || "127.0.0.1", // Use hostname as fallback IP identifier
            }),
          });

          setCurrentVote(null);
          setCurrentCount((prev) => Math.max(0, prev - 1));
          onVoteChange?.(null, currentCount - 1);
          toast.success("Vote removed");
        } else {
          // Submit new vote
          await apiCallJson(`/api/customer/reviews/${reviewId}/helpful`, {
            method: "POST",
            body: JSON.stringify({
              is_helpful: vote === "helpful",
              user_id: null, // TODO: Get from user context/auth when authentication is implemented
              ip_address: window?.location?.hostname || "127.0.0.1", // Use hostname as fallback IP identifier
            }),
          });

          // Update count based on previous vote
          let newCount = currentCount;
          if (currentVote === "not_helpful" && vote === "helpful") {
            newCount += 2; // Remove not helpful, add helpful
          } else if (currentVote === null) {
            newCount += vote === "helpful" ? 1 : 0; // Only helpful votes count
          } else if (currentVote === "helpful" && vote === "not_helpful") {
            newCount -= 1; // Remove helpful vote
          }

          setCurrentVote(vote);
          setCurrentCount(newCount);
          onVoteChange?.(vote, newCount);

          toast.success(
            vote === "helpful"
              ? "Thank you for your feedback!"
              : "Feedback recorded"
          );
        }
      } catch (error) {
        console.error("Error voting on review:", error);
        toast.error("Failed to vote on review");
      } finally {
        setIsVoting(false);
      }
    },
    [apiCallJson, reviewId, currentVote, currentCount, isVoting, onVoteChange]
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-gray-600">Was this review helpful?</span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote("helpful")}
          disabled={isVoting}
          className={cn(
            "h-8 px-2 text-sm",
            currentVote === "helpful" &&
              "bg-green-100 text-green-700 hover:bg-green-200"
          )}
        >
          <ThumbsUp
            className={cn(
              "w-4 h-4 mr-1",
              currentVote === "helpful" && "text-green-600"
            )}
          />
          Yes
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleVote("not_helpful")}
          disabled={isVoting}
          className={cn(
            "h-8 px-2 text-sm",
            currentVote === "not_helpful" &&
              "bg-red-100 text-red-700 hover:bg-red-200"
          )}
        >
          <ThumbsDown
            className={cn(
              "w-4 h-4 mr-1",
              currentVote === "not_helpful" && "text-red-600"
            )}
          />
          No
        </Button>
      </div>

      {currentCount > 0 && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <CheckCircle className="w-3 h-3" />
          <span>{currentCount} people found this helpful</span>
        </div>
      )}

      {isVoting && <div className="text-xs text-gray-500">Updating...</div>}
    </div>
  );
}

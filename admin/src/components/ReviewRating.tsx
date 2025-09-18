"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function ReviewRating({
  rating,
  maxRating = 5,
  size = "md",
  showNumber = false,
  interactive = false,
  onRatingChange,
  className,
}: ReviewRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starRating = index + 1;
        const isFilled = starRating <= rating;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleStarClick(starRating)}
            disabled={!interactive}
            className={cn(
              "transition-colors duration-200",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled ? "text-yellow-400 fill-current" : "text-gray-300",
                interactive && "hover:text-yellow-300"
              )}
            />
          </button>
        );
      })}

      {showNumber && (
        <span
          className={cn(
            "ml-1 text-gray-600",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base"
          )}
        >
          ({rating})
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Filter, X, RotateCcw } from "lucide-react";

interface ReviewFilterProps {
  filters: {
    search: string;
    status: string;
    rating: string;
    productId: string;
    userId: string;
    verifiedOnly: boolean;
    sortBy: string;
    sortOrder: string;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
  className?: string;
}

export function ReviewFilter({
  filters,
  onFiltersChange,
  onReset,
  className,
}: ReviewFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: string, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-");
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.rating ||
    filters.productId ||
    filters.userId ||
    filters.verifiedOnly;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="text-sm font-normal text-blue-600">
                ({Object.values(filters).filter(Boolean).length} active)
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search reviews..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
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
              <Label className="text-sm font-medium">Rating</Label>
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
              <Label className="text-sm font-medium">Sort by</Label>
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest first</SelectItem>
                  <SelectItem value="created_at-asc">Oldest first</SelectItem>
                  <SelectItem value="rating-desc">Highest rating</SelectItem>
                  <SelectItem value="rating-asc">Lowest rating</SelectItem>
                  <SelectItem value="helpful_count-desc">
                    Most helpful
                  </SelectItem>
                  <SelectItem value="product_name-asc">Product A-Z</SelectItem>
                  <SelectItem value="product_name-desc">Product Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product ID */}
            <div className="space-y-2">
              <Label htmlFor="productId" className="text-sm font-medium">
                Product ID
              </Label>
              <Input
                id="productId"
                placeholder="Enter product ID..."
                value={filters.productId}
                onChange={(e) =>
                  handleFilterChange("productId", e.target.value)
                }
              />
            </div>

            {/* User ID */}
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-sm font-medium">
                User ID
              </Label>
              <Input
                id="userId"
                placeholder="Enter user ID..."
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
              />
            </div>

            {/* Verified Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Verified Only</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="verifiedOnly"
                  checked={filters.verifiedOnly}
                  onCheckedChange={(checked) =>
                    handleFilterChange("verifiedOnly", checked)
                  }
                />
                <Label htmlFor="verifiedOnly" className="text-sm text-gray-600">
                  Show only verified purchases
                </Label>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">
                  Active filters:
                </span>

                {filters.search && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Search: &ldquo;{filters.search}&rdquo;
                    <button
                      onClick={() => handleFilterChange("search", "")}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.status && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Status: {filters.status}
                    <button
                      onClick={() => handleFilterChange("status", "")}
                      className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.rating && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Rating: {filters.rating} stars
                    <button
                      onClick={() => handleFilterChange("rating", "")}
                      className="ml-1 hover:bg-yellow-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.verifiedOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    Verified only
                    <button
                      onClick={() => handleFilterChange("verifiedOnly", false)}
                      className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

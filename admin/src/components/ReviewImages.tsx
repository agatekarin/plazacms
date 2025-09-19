"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewImagesProps {
  images: Array<{
    media_id: string;
    display_order: number;
    url: string;
    alt_text?: string;
  }>;
  maxDisplay?: number;
  className?: string;
}

export function ReviewImages({
  images,
  maxDisplay = 4,
  className,
}: ReviewImagesProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sort images by display order
  const sortedImages = [...images].sort(
    (a, b) => a.display_order - b.display_order
  );
  const displayImages = sortedImages.slice(0, maxDisplay);
  const hasMoreImages = images.length > maxDisplay;

  // Open image modal
  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setIsModalOpen(true);
  };

  // Close image modal
  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImageIndex(null);
  };

  // Navigate to previous image
  const goToPrevious = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        selectedImageIndex > 0
          ? selectedImageIndex - 1
          : sortedImages.length - 1
      );
    }
  };

  // Navigate to next image
  const goToNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        selectedImageIndex < sortedImages.length - 1
          ? selectedImageIndex + 1
          : 0
      );
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isModalOpen) return;

    switch (e.key) {
      case "Escape":
        closeImageModal();
        break;
      case "ArrowLeft":
        goToPrevious();
        break;
      case "ArrowRight":
        goToNext();
        break;
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ZoomIn className="w-4 h-4" />
          <span>Customer Photos ({images.length})</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {displayImages.map((image, index) => (
            <div
              key={image.media_id}
              className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer group hover:shadow-md transition-shadow"
              onClick={() => openImageModal(index)}
            >
              <OptimizedImage
                src={image.url}
                alt={image.alt_text || "Review image"}
                className="object-cover group-hover:scale-105 transition-transform duration-200 w-full h-full"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            </div>
          ))}

          {/* Show more indicator */}
          {hasMoreImages && (
            <div
              className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer group hover:shadow-md transition-shadow bg-gray-100 flex items-center justify-center"
              onClick={() => openImageModal(maxDisplay)}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  +{images.length - maxDisplay}
                </div>
                <div className="text-xs text-gray-500">more</div>
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {isModalOpen && selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={closeImageModal}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Navigation buttons */}
          {sortedImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={goToNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* Image */}
          <div className="max-w-4xl max-h-[90vh] p-4">
            <OptimizedImage
              src={sortedImages[selectedImageIndex].url}
              alt={sortedImages[selectedImageIndex].alt_text || "Review image"}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Image counter */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {selectedImageIndex + 1} of {sortedImages.length}
            </div>
          )}

          {/* Click outside to close */}
          <div className="absolute inset-0 -z-10" onClick={closeImageModal} />
        </div>
      )}
    </>
  );
}

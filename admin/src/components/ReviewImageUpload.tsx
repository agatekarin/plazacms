"use client";

import { useState, useCallback, useRef } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  Upload,
  X,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewImageUploadProps {
  reviewId: string;
  existingImages?: Array<{
    media_id: string;
    display_order: number;
    url: string;
    alt_text?: string;
  }>;
  maxImages?: number;
  onImagesChange?: (images: any[]) => void;
  className?: string;
}

interface UploadingImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export function ReviewImageUpload({
  reviewId,
  existingImages = [],
  maxImages = 5,
  onImagesChange,
  className,
}: ReviewImageUploadProps) {
  const { uploadWithProgress, apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Upload failed");
    },
  });

  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [images, setImages] = useState(existingImages);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) => {
        // Check file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          return false;
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) return;

      // Check total images limit
      const totalImages =
        images.length + uploadingImages.length + validFiles.length;
      if (totalImages > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      // Create uploading image objects
      const newUploadingImages: UploadingImage[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "uploading",
      }));

      setUploadingImages((prev) => [...prev, ...newUploadingImages]);

      // Upload each file
      newUploadingImages.forEach((uploadingImage) => {
        uploadImage(uploadingImage);
      });
    },
    [images.length, uploadingImages.length, maxImages]
  );

  // Upload single image
  const uploadImage = async (uploadingImage: UploadingImage) => {
    try {
      const formData = new FormData();
      formData.append("file", uploadingImage.file);
      formData.append("review_id", reviewId);

      const response = await uploadWithProgress(
        "/api/admin/review-images/upload",
        formData,
        (progress) => {
          setUploadingImages((prev) =>
            prev.map((img) =>
              img.id === uploadingImage.id ? { ...img, progress } : img
            )
          );
        }
      );

      // Update uploading image status
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadingImage.id
            ? { ...img, status: "success", progress: 100 }
            : img
        )
      );

      // Add to images list
      const newImage = {
        media_id: response.media_id,
        display_order: images.length + 1,
        url: response.url,
        alt_text: uploadingImage.file.name,
      };

      setImages((prev) => [...prev, newImage]);
      onImagesChange?.([...images, newImage]);

      toast.success(`${uploadingImage.file.name} uploaded successfully`);

      // Clean up uploading image after delay
      setTimeout(() => {
        setUploadingImages((prev) =>
          prev.filter((img) => img.id !== uploadingImage.id)
        );
        URL.revokeObjectURL(uploadingImage.preview);
      }, 2000);
    } catch (error) {
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadingImage.id
            ? {
                ...img,
                status: "error",
                error: "Upload failed",
              }
            : img
        )
      );
      URL.revokeObjectURL(uploadingImage.preview);
    }
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Remove image
  const removeImage = async (mediaId: string) => {
    try {
      await apiCallJson(
        `/api/admin/review-images/${reviewId}/images/${mediaId}`,
        {
          method: "DELETE",
        }
      );

      setImages((prev) => prev.filter((img) => img.media_id !== mediaId));
      onImagesChange?.(images.filter((img) => img.media_id !== mediaId));

      toast.success("Image removed successfully");
    } catch (error) {
      toast.error("Failed to remove image");
    }
  };

  // Reorder images
  const reorderImages = async (newOrder: any[]) => {
    try {
      await apiCallJson(`/api/admin/review-images/${reviewId}/images/reorder`, {
        method: "POST",
        body: JSON.stringify({
          media_ids: newOrder.map((img) => img.media_id),
        }),
      });

      setImages(newOrder);
      onImagesChange?.(newOrder);

      toast.success("Images reordered successfully");
    } catch (error) {
      toast.error("Failed to reorder images");
    }
  };

  // Move image up
  const moveImageUp = (index: number) => {
    if (index === 0) return;

    const newOrder = [...images];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    reorderImages(newOrder);
  };

  // Move image down
  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return;

    const newOrder = [...images];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    reorderImages(newOrder);
  };

  // Remove uploading image
  const removeUploadingImage = (id: string) => {
    setUploadingImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Retry upload
  const retryUpload = (uploadingImage: UploadingImage) => {
    setUploadingImages((prev) =>
      prev.map((img) =>
        img.id === uploadingImage.id
          ? { ...img, status: "uploading", progress: 0, error: undefined }
          : img
      )
    );
    uploadImage(uploadingImage);
  };

  const canUploadMore = images.length + uploadingImages.length < maxImages;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {canUploadMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            )}
          >
          <CardContent className="p-6">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Review Images
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop images here, or click to select files
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                Maximum {maxImages} images, 10MB each
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Uploading Images */}
      {uploadingImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploading...</h4>
          {uploadingImages.map((uploadingImage) => (
            <Card key={uploadingImage.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border">
                    <OptimizedImage
                      src={uploadingImage.preview}
                      alt="Uploading"
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {uploadingImage.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {uploadingImage.status === "uploading" && (
                        <>
                          <Progress
                            value={uploadingImage.progress}
                            className="flex-1 h-2"
                          />
                          <span className="text-xs text-gray-500">
                            {uploadingImage.progress}%
                          </span>
                        </>
                      )}
                      {uploadingImage.status === "success" && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Uploaded</span>
                        </div>
                      )}
                      {uploadingImage.status === "error" && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">
                            {uploadingImage.error}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {uploadingImage.status === "error" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => retryUpload(uploadingImage)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUploadingImage(uploadingImage.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Existing Images */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Review Images ({images.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <Card key={image.media_id}>
                <CardContent className="p-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden border">
                    <OptimizedImage
                      src={image.url}
                      alt={image.alt_text || "Review image"}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                        onClick={() => removeImage(image.media_id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                        onClick={() => moveImageUp(index)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
                        onClick={() => moveImageDown(index)}
                        disabled={index === images.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {image.alt_text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

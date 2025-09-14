"use client";

import { useState } from "react";
import {
  Check,
  Eye,
  Edit3,
  Trash2,
  FileImage,
  Upload,
  ImageIcon,
  MoreHorizontal,
  Calendar,
  HardDrive,
  Folder,
  RefreshCw,
} from "lucide-react";
import {
  OptimizedImage,
  ProductThumbnail,
} from "@/components/ui/optimized-image";

interface MediaItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  size: number;
  alt_text?: string;
  media_type: string;
  folder_id?: string;
  folder_name?: string;
  folder_path?: string;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface MediaGridProps {
  media: MediaItem[];
  view: "grid" | "list";
  selectedMedia: Set<string>;
  onMediaSelect: (mediaId: string, selected: boolean) => void;
  onMediaSelectAll: (selected: boolean) => void;
  onPreview: (media: MediaItem) => void;
  onEdit: (media: MediaItem) => void;
  onOpenBulkActions: () => void;
  loading?: boolean;
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

// Get file type icon
function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.startsWith("video/")) return "🎥";
  if (fileType.startsWith("audio/")) return "🎵";
  if (fileType.includes("pdf")) return "📄";
  if (fileType.includes("zip") || fileType.includes("rar")) return "📦";
  return "📁";
}

// Media type badge color
function getMediaTypeBadge(mediaType: string): { color: string; text: string } {
  const types = {
    product_image: { color: "bg-green-100 text-green-800", text: "Product" },
    product_variant_image: {
      color: "bg-blue-100 text-blue-800",
      text: "Variant",
    },
    user_profile: { color: "bg-purple-100 text-purple-800", text: "Profile" },
    review_image: { color: "bg-yellow-100 text-yellow-800", text: "Review" },
    site_asset: { color: "bg-gray-100 text-gray-800", text: "Asset" },
    other: { color: "bg-gray-100 text-gray-600", text: "Other" },
  };
  return types[mediaType as keyof typeof types] || types.other;
}

// Grid Item Component
function GridItem({
  media,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
}: {
  media: MediaItem;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
  onEdit: () => void;
}) {
  const isImage = media.file_type.startsWith("image/");
  const badge = getMediaTypeBadge(media.media_type);

  return (
    <div
      className={`relative bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md group ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(e.target.checked);
          }}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* Media Type Badge */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}
        >
          {badge.text}
        </span>
      </div>

      {/* Media Preview */}
      <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
        {isImage ? (
          <OptimizedImage
            src={media.file_url}
            alt={media.alt_text || media.filename}
            width={300}
            height={300}
            crop="fill"
            quality={80}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl">{getFileIcon(media.file_type)}</div>
          </div>
        )}
      </div>

      {/* Media Info */}
      <div className="p-3">
        <div
          className="font-medium text-sm truncate mb-1"
          title={media.filename}
        >
          {media.filename}
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div>{formatFileSize(media.size)}</div>
          <div title={formatDate(media.created_at)}>
            {new Date(media.created_at).toLocaleDateString()}
          </div>
          {media.folder_name && (
            <div className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              <span className="truncate">{media.folder_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent backdrop-blur-[2px] transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-gray-900 text-xs rounded-lg font-medium shadow-lg border border-white/50 hover:bg-white hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-gray-900 text-xs rounded-lg font-medium shadow-lg border border-white/50 hover:bg-white hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// List Item Component
function ListItem({
  media,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
}: {
  media: MediaItem;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
  onEdit: () => void;
}) {
  const isImage = media.file_type.startsWith("image/");
  const badge = getMediaTypeBadge(media.media_type);

  return (
    <div
      className={`flex items-center gap-4 p-3 bg-white border rounded-lg transition-all duration-200 hover:shadow-sm ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Selection */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          onSelect(e.target.checked);
        }}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />

      {/* Thumbnail */}
      <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
        {isImage ? (
          <ProductThumbnail
            src={media.file_url}
            alt={media.alt_text || media.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">
            {getFileIcon(media.file_type)}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" title={media.filename}>
          {media.filename}
        </div>
        <div className="text-xs text-gray-500">
          {media.alt_text || "No alt text"}
        </div>
      </div>

      {/* Type */}
      <div className="flex-shrink-0">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}
        >
          {badge.text}
        </span>
      </div>

      {/* Folder */}
      <div className="w-32 flex-shrink-0 text-xs text-gray-600 truncate">
        {media.folder_name ? (
          <span title={media.folder_path} className="flex items-center gap-1">
            <Folder className="w-3 h-3" />
            {media.folder_name}
          </span>
        ) : (
          <span className="text-gray-400">No folder</span>
        )}
      </div>

      {/* Size */}
      <div className="w-20 flex-shrink-0 text-xs text-gray-600 text-right">
        {formatFileSize(media.size)}
      </div>

      {/* Date */}
      <div className="w-32 flex-shrink-0 text-xs text-gray-600 text-right">
        {new Date(media.created_at).toLocaleDateString()}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <button
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Preview"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            className="p-2 hover:bg-red-100 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaGrid({
  media,
  view,
  selectedMedia,
  onMediaSelect,
  onMediaSelectAll,
  onPreview,
  onEdit,
  onOpenBulkActions,
  loading = false,
}: MediaGridProps) {
  const allSelected =
    media.length > 0 && media.every((item) => selectedMedia.has(item.id));
  const someSelected = media.some((item) => selectedMedia.has(item.id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <div className="text-lg font-medium text-gray-900 mb-2">
          Loading media library
        </div>
        <div className="text-sm text-gray-500">
          Please wait while we fetch your files...
        </div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6">
          <ImageIcon className="w-10 h-10 text-gray-400" />
        </div>

        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No media files found
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Upload your first images to get started with your media library.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Upload className="w-4 h-4" />
              Upload Files
            </button>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Media Content */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {media.map((item) => (
            <GridItem
              key={item.id}
              media={item}
              isSelected={selectedMedia.has(item.id)}
              onSelect={(selected) => onMediaSelect(item.id, selected)}
              onPreview={() => onPreview(item)}
              onEdit={() => onEdit(item)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {media.map((item) => (
            <ListItem
              key={item.id}
              media={item}
              isSelected={selectedMedia.has(item.id)}
              onSelect={(selected) => onMediaSelect(item.id, selected)}
              onPreview={() => onPreview(item)}
              onEdit={() => onEdit(item)}
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Bulk Actions Bar */}
      {(selectedMedia.size > 0 || someSelected) && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="mx-auto max-w-[1200px] px-4 pb-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 shadow-md">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input)
                          input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={(e) => onMediaSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedMedia.size} of {media.length} files selected
                    </span>
                    <div className="text-xs text-blue-600 mt-0.5">
                      Bulk actions will be available soon
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      const first = media.find((m) => selectedMedia.has(m.id));
                      if (first) onPreview(first);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors"
                    onClick={onOpenBulkActions}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    Bulk Actions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

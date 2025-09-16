"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  X,
  Check,
  Upload,
  FolderPlus,
  RefreshCw,
  Search,
  Filter,
  Grid3X3,
  List,
  Image as ImageIcon,
  Folder,
  FileImage,
  Download,
  MoreHorizontal,
  Eye,
  Settings,
  Star,
  Calendar,
  User,
  HardDrive,
  Tags,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  LayoutGrid,
  SquareStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export interface MediaItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  size: number;
  alt_text?: string;
  media_type: string;
  folder_name?: string;
  folder_path?: string;
  uploaded_by_name?: string;
  created_at: string;
}

interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  description?: string;
  media_count: number;
  children_count: number;
}

interface MediaPickerProps {
  mode: "single" | "multiple";
  mediaType: "product_image" | "product_variant_image" | "user_profile";
  selectedMedia?: MediaItem[];
  onSelect: (media: MediaItem[]) => void;
  onClose: () => void;
  autoCreateFolder?: string; // e.g., "products"
  productSlug?: string; // For auto-folder creation
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function MediaPicker({
  mode,
  mediaType,
  selectedMedia = [],
  onSelect,
  onClose,
  autoCreateFolder,
  productSlug,
}: MediaPickerProps) {
  // Session and Auth
  const { data: session } = useSession();

  // Enhanced API Helper with global error handling
  const {
    apiCall,
    apiCallJson,
    isLoading: apiLoading,
  } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`MediaPicker API Error on ${url}:`, error);
      toast.error(error?.message || "API request failed");
    },
  });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(selectedMedia.map((m) => m.id))
  );
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [isAutoCreatingFolder, setIsAutoCreatingFolder] = useState(false);
  // Use global loading state from useAuthenticatedFetch hook
  const loading = apiLoading;

  const loadFolders = async () => {
    try {
      const data = await apiCallJson(
        "/api/admin/media/folders?include_children=true"
      );
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error("Failed to load folders:", error);
    }
  };

  const loadMedia = useCallback(
    async (forceRefresh = false) => {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "50",
          view,
        });

        if (selectedFolder) params.set("folder_id", selectedFolder);
        if (search) params.set("search", search);
        // Add cache busting for force refresh
        if (forceRefresh) params.set("_t", Date.now().toString());

        console.log(
          "MediaPicker: Loading media with params:",
          params.toString()
        );
        const data = await apiCallJson(`/api/admin/media?${params}`, {
          // Prevent caching issues
          cache: forceRefresh ? "no-cache" : "default",
        });

        console.log("MediaPicker: API response:", data);

        if (data.success) {
          setMedia(data.items || []);
          console.log("MediaPicker: Set media items:", data.items?.length || 0);
        } else {
          console.error("MediaPicker: API returned error:", data.error);
          setMedia([]); // Clear media on error
        }
      } catch (error) {
        // Error already handled by useAuthenticatedFetch interceptor
        console.error("Failed to load media:", error);
        setMedia([]); // Clear media on error
      }
    },
    [selectedFolder, search, view]
  );

  const autoCreateProductFolder = async () => {
    if (!autoCreateFolder || isAutoCreatingFolder) return;

    setIsAutoCreatingFolder(true);
    console.log("MediaPicker: Auto-creating folder:", autoCreateFolder);
    console.log("MediaPicker: Available folders:", folders);

    // Handle nested folder paths like "products/variants"
    if (autoCreateFolder.includes("/")) {
      const parts = autoCreateFolder.split("/");
      const parentName = parts[0]; // "products"
      const childName = parts[1]; // "variants"

      // Check if parent folder exists
      let parentFolder = folders.find(
        (f) => f.name.toLowerCase() === parentName.toLowerCase() && !f.parent_id
      );

      if (!parentFolder) {
        // Create parent folder first
        console.log("MediaPicker: Creating parent folder:", parentName);
        const data = await apiCallJson("/api/admin/media/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: parentName,
            description: `${parentName} folder`,
          }),
        });
        if (data.success) {
          await loadFolders(); // Reload to get parent folder
          parentFolder = folders.find(
            (f) =>
              f.name.toLowerCase() === parentName.toLowerCase() && !f.parent_id
          );
        }
      }

      if (parentFolder) {
        // Check if child folder exists
        let childFolder = folders.find(
          (f) =>
            f.name.toLowerCase() === childName.toLowerCase() &&
            f.parent_id === parentFolder.id
        );

        if (!childFolder) {
          // Create child folder
          console.log(
            "MediaPicker: Creating child folder:",
            childName,
            "under parent:",
            parentFolder.id
          );
          const data = await apiCallJson("/api/admin/media/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: childName,
              description: `${childName} folder`,
              parent_id: parentFolder.id,
            }),
          });
          if (data.success) {
            await loadFolders(); // Reload to get child folder
            childFolder = folders.find(
              (f) =>
                f.name.toLowerCase() === childName.toLowerCase() &&
                f.parent_id === parentFolder.id
            );
          }
        }

        if (childFolder) {
          console.log("MediaPicker: Found/created child folder:", childFolder);
          setSelectedFolder(childFolder.id);
          setIsAutoCreatingFolder(false);
          return;
        }
      }
    } else {
      // Simple folder (no nesting)
      const targetFolder = folders.find(
        (f) =>
          f.name.toLowerCase() === autoCreateFolder.toLowerCase() &&
          !f.parent_id
      );

      if (targetFolder) {
        console.log("MediaPicker: Found existing folder:", targetFolder);
        setSelectedFolder(targetFolder.id);
        setIsAutoCreatingFolder(false);
        return;
      }

      // Create simple folder if it doesn't exist
      try {
        console.log("MediaPicker: Creating new folder:", autoCreateFolder);
        const data = await apiCallJson("/api/admin/media/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: autoCreateFolder,
            description: `${autoCreateFolder} folder`,
          }),
        });
        console.log("MediaPicker: Folder creation response:", data);

        if (data.success) {
          await loadFolders(); // Reload folders
          setSelectedFolder(data.folder.id);
          console.log("MediaPicker: Set selected folder to:", data.folder.id);
          // Force reload media for new folder
          setTimeout(() => loadMedia(true), 100);
        }
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    }

    setIsAutoCreatingFolder(false);
  };

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load media when folder changes (but only after folders are loaded)
  useEffect(() => {
    if (folders.length > 0) {
      loadMedia();
    }
  }, [folders.length, selectedFolder, search]);

  // Auto-create and select products folder (prevent multiple calls)
  useEffect(() => {
    if (
      autoCreateFolder &&
      folders.length > 0 &&
      !isAutoCreatingFolder &&
      !selectedFolder
    ) {
      autoCreateProductFolder();
    }
  }, [
    folders,
    autoCreateFolder,
    productSlug,
    isAutoCreatingFolder,
    selectedFolder,
  ]);

  const handleMediaSelect = (mediaItem: MediaItem) => {
    const newSelected = new Set(selectedItems);

    if (mode === "single") {
      newSelected.clear();
      newSelected.add(mediaItem.id);
    } else {
      if (newSelected.has(mediaItem.id)) {
        newSelected.delete(mediaItem.id);
      } else {
        newSelected.add(mediaItem.id);
      }
    }

    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const selectedMediaItems = media.filter((m) => selectedItems.has(m.id));
    onSelect(selectedMediaItems);
    onClose();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    console.log("MediaPicker: Starting upload of", files.length, "files");
    console.log("MediaPicker: Selected folder for upload:", selectedFolder);
    console.log("MediaPicker: Media type:", mediaType);

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        console.log("MediaPicker: Uploading file:", file.name);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("media_type", mediaType);
        if (selectedFolder) formData.append("folder_id", selectedFolder);

        const responseData = await apiCallJson("/api/admin/media/upload", {
          method: "POST",
          body: formData,
        });
        console.log("MediaPicker: Upload response:", responseData);

        // apiCallJson already handles response parsing and errors
      }

      console.log("MediaPicker: All uploads completed, reloading media");
      await loadMedia(true); // Force refresh after upload
      toast.success(
        `${files.length} file${
          files.length > 1 ? "s" : ""
        } uploaded successfully`
      );
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 max-w-7xl w-full max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* Modern Header */}
        <div className="bg-white border-b border-gray-200/60 rounded-t-2xl">
          <div className="px-6 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {mode === "single" ? "Select Image" : "Select Images"}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {mode === "single" ? "Single" : "Multiple"}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    {mediaType === "user_profile"
                      ? `Choose ${
                          mode === "single" ? "an image" : "images"
                        } for user profile`
                      : `Choose ${
                          mode === "single" ? "an image" : "images"
                        } for your ${
                          mediaType === "product_variant_image"
                            ? "product variant"
                            : "product"
                        }`}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {media.length} items
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMedia(true)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <SquareStack className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">Selected:</span>
                  <span className="font-medium text-gray-900">
                    {selectedItems.size} of {media.length}
                  </span>
                </div>

                {selectedFolder && (
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-500">Folder:</span>
                    <span className="font-medium text-blue-600">
                      {folders.find((f) => f.id === selectedFolder)?.name ||
                        "Unknown"}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Tags className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500">Type:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {mediaType.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Toolbar */}
        <div className="bg-gray-50/50 border-b border-gray-200/60">
          <div className="p-6 space-y-4">
            {/* Top Row - Search & Actions */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search images by name, type, or folder..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Upload & View Options */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
                  <Button
                    variant={view === "grid" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setView("grid")}
                    className="p-2"
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={view === "list" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setView("list")}
                    className="p-2"
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                {/* Upload Button */}
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {uploading ? "Uploading..." : "Upload Images"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Bottom Row - Folder Selection & Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Folder Selection */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Folder:
                  </span>
                </div>
                <select
                  value={selectedFolder || ""}
                  onChange={(e) => setSelectedFolder(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 min-w-[200px]"
                >
                  <option value="">📁 All Media</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.parent_id ? "📂" : "📁"} {folder.path} (
                      {folder.media_count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selection Info */}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedItems.size} image
                    {selectedItems.size > 1 ? "s" : ""} selected
                  </span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="ml-auto flex items-center gap-2">
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch("")}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Clear search
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            /* Loading State */
            <div className="p-8">
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <div className="text-lg font-medium text-gray-900 mb-2">
                  Loading media library
                </div>
                <div className="text-sm text-gray-500">
                  Please wait while we fetch your images...
                </div>
              </div>
            </div>
          ) : media.length === 0 ? (
            /* Empty State */
            <div className="p-8">
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6">
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                </div>

                <div className="text-center max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {search ? "No images found" : "No media in this location"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {search
                      ? `No images match "${search}". Try a different search term.`
                      : "Get started by uploading your first images to this folder."}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {search ? (
                      <Button
                        variant="outline"
                        onClick={() => setSearch("")}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear search
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() =>
                          document.getElementById("file-upload")?.click()
                        }
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload images
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      onClick={() => loadMedia(true)}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>

                    {selectedFolder && (
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedFolder(null)}
                        className="flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4" />
                        Show all media
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Media Grid/List */
            <div className="p-6">
              {view === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className={`relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-200 ${
                        selectedItems.has(item.id)
                          ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg scale-105"
                          : "hover:shadow-lg hover:scale-105 border border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleMediaSelect(item)}
                    >
                      {/* Image Container */}
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        <img
                          src={item.file_url}
                          alt={item.alt_text || item.filename}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      {/* Selection Indicator */}
                      <div
                        className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                          selectedItems.has(item.id)
                            ? "bg-blue-600 text-white scale-110"
                            : "bg-white/90 backdrop-blur-sm text-gray-600 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </div>

                      {/* File Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="text-xs font-medium truncate mb-1">
                          {item.filename}
                        </div>
                        <div className="text-xs opacity-80 flex items-center gap-2">
                          <span>{formatFileSize(item.size)}</span>
                          {item.folder_name && (
                            <>
                              <span>•</span>
                              <span>{item.folder_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-2">
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedItems.has(item.id)
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                      onClick={() => handleMediaSelect(item)}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={item.file_url}
                          alt={item.alt_text || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.filename}
                          </h4>
                          {selectedItems.has(item.id) && (
                            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                          <span>{formatFileSize(item.size)}</span>
                          {item.folder_name && (
                            <span>📁 {item.folder_name}</span>
                          )}
                          <span>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="p-2">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-2">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modern Footer */}
        <div className="bg-gray-50/50 border-t border-gray-200/60 rounded-b-2xl">
          <div className="px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Selection Summary */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <SquareStack className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedItems.size} of {media.length} selected
                  </span>
                </div>

                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>•</span>
                    <span>
                      {mode === "single"
                        ? "Single selection"
                        : "Multiple selection"}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>

                <Button
                  onClick={handleConfirm}
                  disabled={selectedItems.size === 0}
                  className="flex items-center gap-2"
                  variant="primary"
                >
                  <Check className="w-4 h-4" />
                  {selectedItems.size === 0
                    ? "Select Images"
                    : `Use ${selectedItems.size} Image${
                        selectedItems.size > 1 ? "s" : ""
                      }`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

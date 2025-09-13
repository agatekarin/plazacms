"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FolderOpen,
  Folder,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  LayoutGrid,
  List,
  Upload,
  Settings,
  Image as ImageIcon,
  HardDrive,
  Tags,
  Calendar,
  User,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Eye,
  Download,
  FileImage,
  BarChart3,
  Grid3X3,
  SquareStack,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MediaGrid from "./MediaGrid";
import UploadModal from "./UploadModal";
import MediaDetailsPanel from "./MediaDetailsPanel";
import FolderModal from "./FolderModal";
import BulkOperationsModal from "./BulkOperationsModal";
import toast from "react-hot-toast";

// Types
interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  description?: string;
  media_count: number | string; // Allow both for safety during conversion
  children_count: number | string; // Allow both for safety during conversion
  level?: number;
}

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

interface MediaResponse {
  success: boolean;
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: {
    folder_id?: string;
    search?: string;
    type?: string;
    view: string;
  };
}

// Folder Tree Component
function FolderTree({
  folders,
  selectedFolder,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  isCollapsed,
  totalMediaCount,
}: {
  folders: MediaFolder[];
  selectedFolder?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderCreate: (parentId?: string) => void;
  onFolderEdit: (folder: MediaFolder) => void;
  onFolderDelete: (folder: MediaFolder) => void;
  isCollapsed: boolean;
  totalMediaCount: number;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  // Auto-expand folders that have the selected folder
  useEffect(() => {
    if (selectedFolder && folders.length > 0) {
      const selectedFolderData = folders.find((f) => f.id === selectedFolder);
      if (selectedFolderData) {
        const newExpanded = new Set(expandedFolders);

        // Expand all parent folders of selected folder
        let currentFolder: MediaFolder | null = selectedFolderData;
        while (currentFolder && currentFolder.parent_id) {
          newExpanded.add(currentFolder.parent_id);
          currentFolder =
            folders.find((f) => f.id === currentFolder!.parent_id) || null;
        }

        setExpandedFolders(newExpanded);
      }
    }
  }, [selectedFolder, folders]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Build tree structure
  const folderMap = new Map<
    string,
    MediaFolder & { children: MediaFolder[] }
  >();
  const rootFolders: (MediaFolder & { children: MediaFolder[] })[] = [];

  // Initialize folder map
  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Build hierarchy
  folders.forEach((folder) => {
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children.push(folderMap.get(folder.id)!);
    } else {
      rootFolders.push(folderMap.get(folder.id)!);
    }
  });

  const renderFolder = (
    folder: MediaFolder & { children: MediaFolder[] },
    level = 0
  ) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children.length > 0;
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative ${
            isSelected
              ? "bg-blue-50 border border-blue-200 text-blue-900 shadow-sm"
              : "hover:bg-gray-50 border border-transparent"
          }`}
          style={{
            paddingLeft: `${12 + level * 20}px`,
            marginLeft: level > 0 ? `${level * 4}px` : "0px",
          }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded-md transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          {/* Folder Icon */}
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-md ${
              isSelected ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            {hasChildren ? (
              <FolderOpen
                className={`w-4 h-4 ${
                  isSelected ? "text-blue-600" : "text-gray-600"
                }`}
              />
            ) : (
              <Folder
                className={`w-4 h-4 ${
                  isSelected ? "text-blue-600" : "text-gray-600"
                }`}
              />
            )}
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0 relative group/tooltip">
              <span
                className={`text-sm font-medium block truncate ${
                  isSelected ? "text-blue-900" : "text-gray-900"
                }`}
              >
                {folder.name}
              </span>

              {/* Tooltip for full path */}
              <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                📁 {folder.path}
                <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Media Count Badge */}
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isSelected
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {parseInt(folder.media_count?.toString() || "0")}
              </span>

              {/* Action Buttons */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderCreate(folder.id);
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-blue-100 rounded-md transition-colors"
                  title="Create subfolder"
                >
                  <Plus className="w-3 h-3 text-blue-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderEdit(folder);
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded-md transition-colors"
                  title="Edit folder"
                >
                  <Edit3 className="w-3 h-3 text-gray-600" />
                </button>
                {parseInt(folder.media_count?.toString() || "0") === 0 &&
                parseInt(folder.children_count?.toString() || "0") === 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFolderDelete(folder);
                    }}
                    className="w-6 h-6 flex items-center justify-center hover:bg-red-100 rounded-md transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                ) : (
                  <div
                    className="w-6 h-6 flex items-center justify-center opacity-50 cursor-not-allowed"
                    title={`Cannot delete: ${parseInt(
                      folder.media_count?.toString() || "0"
                    )} files, ${parseInt(
                      folder.children_count?.toString() || "0"
                    )} subfolders`}
                  >
                    <Trash2 className="w-3 h-3 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 relative">
            {/* Indentation line for nested folders */}
            {level >= 0 && (
              <div
                className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
                style={{ left: `${20 + level * 20}px` }}
              />
            )}
            <div className="space-y-1">
              {folder.children.map((child) =>
                renderFolder(
                  child as MediaFolder & { children: MediaFolder[] },
                  level + 1
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-gray-50/50 border-r border-gray-200/60 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-80"
      }`}
    >
      {/* Modern Header */}
      <div className="p-4 border-b border-gray-200/60 bg-white">
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Media Folders</h3>
              </div>

              <button
                onClick={() => onFolderCreate()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>

            {/* Folder Stats */}
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <HardDrive className="w-3 h-3" />
              <span>{folders.length} folders</span>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
              <FolderOpen className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        )}
      </div>

      {!isCollapsed ? (
        <div className="p-4 space-y-2">
          {/* Root/All Media */}
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 border ${
              selectedFolder === null
                ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
                : "hover:bg-gray-50 border-transparent"
            }`}
            onClick={() => onFolderSelect(null)}
          >
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-md ${
                selectedFolder === null ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              <SquareStack
                className={`w-4 h-4 ${
                  selectedFolder === null ? "text-blue-600" : "text-gray-600"
                }`}
              />
            </div>

            <span
              className={`text-sm font-medium ${
                selectedFolder === null ? "text-blue-900" : "text-gray-900"
              }`}
            >
              All Media
            </span>

            <div className="ml-auto">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  selectedFolder === null
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {totalMediaCount || 0}
              </span>
            </div>
          </div>

          {/* Folder Tree */}
          <div className="space-y-1">
            {rootFolders.map((folder) => renderFolder(folder))}
          </div>
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {/* Collapsed All Media */}
          <div
            className={`flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
              selectedFolder === null
                ? "bg-blue-50 border-blue-200 shadow-sm"
                : "hover:bg-gray-50 border-transparent"
            }`}
            onClick={() => onFolderSelect(null)}
            title="All Media"
          >
            <SquareStack
              className={`w-5 h-5 ${
                selectedFolder === null ? "text-blue-600" : "text-gray-600"
              }`}
            />
          </div>

          {/* Collapsed Folders */}
          {rootFolders.map((folder) => (
            <div
              key={folder.id}
              className={`relative group/collapsed flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                selectedFolder === folder.id
                  ? "bg-blue-50 border-blue-200 shadow-sm"
                  : "hover:bg-gray-50 border-transparent"
              }`}
              onClick={() => onFolderSelect(folder.id)}
            >
              <Folder
                className={`w-5 h-5 ${
                  selectedFolder === folder.id
                    ? "text-blue-600"
                    : "text-gray-600"
                }`}
              />

              {/* Enhanced Tooltip for collapsed */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover/collapsed:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                <div className="font-medium">{folder.name}</div>
                <div className="text-xs opacity-80 mt-0.5">
                  {folder.media_count} files
                </div>
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Media Manager
export default function MediaManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 24,
    total: 0,
    totalPages: 0,
  });

  // Modals
  const [showFolderModal, setShowFolderModal] = useState<{
    mode: "create" | "edit";
    folder?: MediaFolder;
    parentId?: string;
  } | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMediaDetails, setSelectedMediaDetails] =
    useState<MediaItem | null>(null);
  const [showBulkOperationsModal, setShowBulkOperationsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Mobile folder drawer
  const [showMobileFolders, setShowMobileFolders] = useState(false);

  // Load folders
  const loadFolders = async () => {
    try {
      const res = await fetch("/api/admin/media/folders?include_children=true");
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (err) {}
  };

  // Load media
  const loadMedia = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        view,
      });

      if (selectedFolder) params.set("folder_id", selectedFolder);
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/admin/media?${params}`);
      const data: MediaResponse = await res.json();

      if (data.success) {
        setMedia(data.items);
        setPagination({
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
        });
      } else {
        setError("Failed to load media");
      }
    } catch (err) {
      setError("Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  // Media selection handlers
  const handleMediaSelect = (mediaId: string, selected: boolean) => {
    const newSelected = new Set(selectedMedia);
    if (selected) {
      newSelected.add(mediaId);
    } else {
      newSelected.delete(mediaId);
    }
    setSelectedMedia(newSelected);
  };

  const handleMediaSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedMedia(new Set(media.map((item) => item.id)));
    } else {
      setSelectedMedia(new Set());
    }
  };

  const handleMediaClick = (mediaItem: MediaItem) => {
    setSelectedMediaDetails(mediaItem);
  };

  const handleMediaUpdate = (updatedMedia: MediaItem) => {
    setMedia((prev) =>
      prev.map((item) =>
        item.id === updatedMedia.id ? { ...item, ...updatedMedia } : item
      )
    );
    setSelectedMediaDetails(updatedMedia);
  };

  const handleMediaDelete = (mediaId: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== mediaId));
    setSelectedMediaDetails(null);
  };

  // Initial load
  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadMedia();
  }, [selectedFolder, view, search, typeFilter, pagination.page]);

  // Folder operations
  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolder(folderId);
    setSelectedMedia(new Set());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Close mobile drawer after selecting a folder
  const handleFolderSelectMobile = (folderId: string | null) => {
    handleFolderSelect(folderId);
    setShowMobileFolders(false);
  };

  const handleFolderCreate = (parentId?: string) => {
    setShowFolderModal({ mode: "create", parentId });
  };

  const handleFolderEdit = (folder: MediaFolder) => {
    setShowFolderModal({ mode: "edit", folder });
  };

  const handleFolderDelete = async (folder: MediaFolder) => {
    try {
      const validateRes = await fetch(`/api/admin/media/folders/${folder.id}`);
      const validateData = await validateRes.json();

      if (!validateRes.ok) {
        toast.error("Could not validate folder status");
        return;
      }

      const realTimeFolder = validateData.folder;

      const uiMediaCount = parseInt(folder.media_count?.toString() || "0");
      const uiChildrenCount = parseInt(
        folder.children_count?.toString() || "0"
      );
      const realMediaCount = parseInt(
        realTimeFolder.media_count?.toString() || "0"
      );
      const realChildrenCount = parseInt(
        realTimeFolder.children_count?.toString() || "0"
      );

      if (
        realMediaCount !== uiMediaCount ||
        realChildrenCount !== uiChildrenCount
      ) {
        toast(
          "Folder counts have changed since last load. Refreshing folders...",
          { icon: "ℹ️" }
        );
        await loadFolders();
        return;
      }

      if (realMediaCount > 0 || realChildrenCount > 0) {
        toast.error(
          `Cannot delete folder: contains ${realMediaCount} files and ${realChildrenCount} subfolders`
        );
        return;
      }
    } catch (validateErr) {
      toast.error("Failed to validate folder status");
      return;
    }

    // Enhanced confirmation with folder info
    const message = `Delete folder "${folder.name}"?\n\nThis will permanently remove the folder.`;
    if (!confirm(message)) return;

    try {
      const res = await fetch(`/api/admin/media/folders/${folder.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Folder "${folder.name}" deleted successfully`);
        await loadFolders();
        if (selectedFolder === folder.id) {
          setSelectedFolder(null);
        }
      } else {
        const error = await res.json();
        const errorMessage = error.error || "Failed to delete folder";
        toast.error(errorMessage);
      }
    } catch (err) {
      toast.error("Network error: Failed to delete folder");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 min-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Modern Main Header */}
      <div className="bg-white border-b border-gray-200/60">
        <div className="px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                <ImageIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Media Library
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                    {pagination.total} items
                  </span>
                </h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  Manage your media files and organize them into folders
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedMedia.size} selected
                </span>
              </div>

              {/* Bulk Operations Button */}
              {selectedMedia.size > 0 && (
                <button
                  onClick={() => setShowBulkOperationsModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  title="Bulk Operations"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Actions</span>
                </button>
              )}
              {/* Mobile: open folders drawer */}
              <button
                onClick={() => setShowMobileFolders(true)}
                className="flex md:hidden items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Open folders"
              >
                <Folder className="w-4 h-4" />
                <span>Folders</span>
              </button>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={
                  isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
              >
                {isSidebarCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isSidebarCollapsed ? "Expand" : "Collapse"}
                </span>
              </button>

              <button
                onClick={() => loadMedia()}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <SquareStack className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Total:</span>
                <span className="font-medium text-gray-900">
                  {pagination.total} files
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
                <span className="text-gray-500">Filter:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {typeFilter === "all"
                    ? "All Types"
                    : typeFilter.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="hidden md:block flex-shrink-0">
          <FolderTree
            folders={folders}
            selectedFolder={selectedFolder}
            onFolderSelect={handleFolderSelect}
            onFolderCreate={handleFolderCreate}
            onFolderEdit={handleFolderEdit}
            onFolderDelete={handleFolderDelete}
            isCollapsed={isSidebarCollapsed}
            totalMediaCount={pagination.total}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Modern Toolbar */}
          <div className="bg-gray-50/50 border-b border-gray-200/60">
            <div className="p-6 space-y-4">
              {/* Top Row - Search & Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by filename, type, or folder..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>

                {/* Filters & View */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Type Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <Select
                      value={typeFilter}
                      onValueChange={(value: string) => setTypeFilter(value)}
                    >
                      <SelectTrigger className="min-w-[160px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="product_image">
                          Product Images
                        </SelectItem>
                        <SelectItem value="product_variant_image">
                          Variant Images
                        </SelectItem>
                        <SelectItem value="user_profile">
                          Profile Pictures
                        </SelectItem>
                        <SelectItem value="site_asset">Site Assets</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1 flex-shrink-0">
                    <button
                      onClick={() => setView("grid")}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        view === "grid"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      onClick={() => setView("list")}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        view === "list"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center">
                    <span className="text-xs text-red-600">!</span>
                  </div>
                  <span className="truncate">{error}</span>
                </div>
              )}

              {/* Media Content */}
              <div className="flex-1 p-6 overflow-y-auto bg-white min-w-0">
                <MediaGrid
                  media={media}
                  view={view}
                  selectedMedia={selectedMedia}
                  onMediaSelect={handleMediaSelect}
                  onMediaSelectAll={handleMediaSelectAll}
                  onPreview={(m) => setSelectedMediaDetails(m)}
                  onEdit={(m) => setSelectedMediaDetails(m)}
                  onOpenBulkActions={() => setShowBulkOperationsModal(true)}
                  loading={loading}
                />

                {/* Modern Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Results Info */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4 text-gray-500" />
                        <span>
                          Showing{" "}
                          {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                          {Math.min(
                            pagination.page * pagination.pageSize,
                            pagination.total
                          )}{" "}
                          of {pagination.total} results
                        </span>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: Math.max(1, prev.page - 1),
                            }))
                          }
                          disabled={pagination.page === 1}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Previous
                        </button>

                        <div className="flex items-center gap-1">
                          <span className="px-3 py-2 text-sm font-medium bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                            {pagination.page}
                          </span>
                          <span className="text-sm text-gray-500">of</span>
                          <span className="px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg">
                            {pagination.totalPages}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: Math.min(prev.totalPages, prev.page + 1),
                            }))
                          }
                          disabled={pagination.page === pagination.totalPages}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Folder Drawer */}
      {showMobileFolders && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFolders(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <Folder className="w-4 h-4 text-blue-600" />
                Folders
              </div>
              <button
                onClick={() => setShowMobileFolders(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FolderTree
                folders={folders}
                selectedFolder={selectedFolder}
                onFolderSelect={handleFolderSelectMobile}
                onFolderCreate={handleFolderCreate}
                onFolderEdit={handleFolderEdit}
                onFolderDelete={handleFolderDelete}
                isCollapsed={false}
                totalMediaCount={pagination.total}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        folders={folders.map((f) => ({
          ...f,
          media_count: parseInt(f.media_count?.toString() || "0"),
          children_count: parseInt(f.children_count?.toString() || "0"),
        }))}
        selectedFolder={selectedFolder}
        onUploadComplete={() => {
          loadMedia();
          setShowUploadModal(false);
        }}
      />

      {/* Folder Modal */}
      {showFolderModal && (
        <FolderModal
          isOpen={!!showFolderModal}
          onClose={() => setShowFolderModal(null)}
          onFolderCreated={() => {
            loadFolders();
            setShowFolderModal(null);
          }}
          onFolderUpdated={() => {
            loadFolders();
            setShowFolderModal(null);
          }}
          mode={showFolderModal.mode}
          folder={showFolderModal.folder}
          parentId={showFolderModal.parentId}
          folders={folders}
        />
      )}

      {/* Media Details Panel */}
      <MediaDetailsPanel
        media={selectedMediaDetails}
        folders={folders.map((f) => ({
          ...f,
          media_count: parseInt(f.media_count?.toString() || "0"),
          children_count: parseInt(f.children_count?.toString() || "0"),
        }))}
        isOpen={!!selectedMediaDetails}
        onClose={() => setSelectedMediaDetails(null)}
        onMediaUpdate={handleMediaUpdate}
        onMediaDelete={handleMediaDelete}
      />

      {/* Bulk Operations Modal */}
      <BulkOperationsModal
        isOpen={showBulkOperationsModal}
        onClose={() => setShowBulkOperationsModal(false)}
        selectedMediaIds={Array.from(selectedMedia)}
        onOperationComplete={() => {
          loadMedia();
          loadFolders();
          setSelectedMedia(new Set());
          setShowBulkOperationsModal(false);
        }}
      />
    </div>
  );
}

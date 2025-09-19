"use client";

import { useState, useEffect } from "react";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  X,
  Trash2,
  FolderOpen,
  Tag,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

interface MediaItem {
  id: string;
  filename: string;
  media_type: string;
  folder_id: string | null;
  folder_name: string | null;
  is_referenced: boolean;
}

interface MediaFolder {
  id: string;
  name: string;
  path: string;
}

interface MediaType {
  value: string;
  label: string;
}

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMediaIds: string[];
  onOperationComplete: () => void;
}

export default function BulkOperationsModal({
  isOpen,
  onClose,
  selectedMediaIds,
  onOperationComplete,
}: BulkOperationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>([]);
  const [operation, setOperation] = useState<string>("");
  const [newMediaType, setNewMediaType] = useState<string>("");
  const [newFolderId, setNewFolderId] = useState<string>("__root__");
  const { data: session } = useSession();

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`BulkOperationsModal API Error on ${url}:`, error);
      // Let component handle error display
    },
  });

  // Load media info when modal opens
  useEffect(() => {
    if (isOpen && selectedMediaIds.length > 0) {
      loadMediaInfo();
    }
  }, [isOpen, selectedMediaIds]);

  const loadMediaInfo = async () => {
    try {
      setLoading(true);
      const endpoint = `/api/admin/media/bulk?ids=${selectedMediaIds.join(
        ","
      )}`;

      const data = await apiCallJson(endpoint);

      if (data.success) {
        setMediaInfo(data.media);
        setFolders(data.folders);
        setMediaTypes(data.mediaTypes);
      } else {
        toast.error("Failed to load media information");
      }
    } catch (error) {
      // Error already handled by useAuthenticatedFetch interceptor
      toast.error("Failed to load media information");
    } finally {
      setLoading(false);
    }
  };

  const handleOperation = async () => {
    if (!operation) {
      toast.error("Please select an operation");
      return;
    }

    if (operation === "change_type" && !newMediaType) {
      toast.error("Please select a media type");
      return;
    }

    // Confirm delete operation
    if (operation === "delete") {
      const referencedFiles = mediaInfo?.filter((m) => m.is_referenced) || [];

      if (referencedFiles.length > 0) {
        toast.error(
          `Cannot delete ${referencedFiles.length} file(s) that are currently in use`
        );
        return;
      }

      const confirmed = confirm(
        `Are you sure you want to delete ${selectedMediaIds.length} media file(s)? This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    try {
      setLoading(true);

      const requestData: any = {
        mediaIds: selectedMediaIds,
        operation,
      };

      if (operation === "change_type") {
        requestData.data = { media_type: newMediaType };
      } else if (operation === "change_folder") {
        requestData.data = { folder_id: newFolderId };
      }

      const result = await apiCallJson("/api/admin/media/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (result.success) {
        toast.success(result.message);
        onOperationComplete();
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOperation("");
    setNewMediaType("");
    setNewFolderId("__root__");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const referencedCount = mediaInfo?.filter((m) => m.is_referenced).length || 0;
  const canDelete = referencedCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in-0 duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Bulk Operations
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedMediaIds.length} file(s) selected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !mediaInfo?.length ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading media info...</span>
            </div>
          ) : (
            <>
              {/* Selected Files Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  Selected Files ({mediaInfo?.length || 0})
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {mediaInfo?.map((media) => (
                    <div
                      key={media.id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-gray-700 truncate flex-1">
                        {media.filename}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {media.is_referenced && (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            In use
                          </span>
                        )}
                        <span className="text-gray-500 text-xs">
                          {media.media_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {referencedCount > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">
                        {referencedCount} file(s) are currently in use and
                        cannot be deleted
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Operation Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Operation
                  </label>
                  <Select value={operation} onValueChange={setOperation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="change_type">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Change Media Type
                        </div>
                      </SelectItem>
                      <SelectItem value="change_folder">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          Move to Folder
                        </div>
                      </SelectItem>
                      <SelectItem value="delete" disabled={!canDelete}>
                        <div className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Delete Files
                          {!canDelete && (
                            <span className="text-xs text-gray-500">
                              (Files in use)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Change Media Type */}
                {operation === "change_type" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Media Type
                    </label>
                    <Select
                      value={newMediaType}
                      onValueChange={setNewMediaType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select media type" />
                      </SelectTrigger>
                      <SelectContent>
                        {mediaTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Change Folder */}
                {operation === "change_folder" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Folder
                    </label>
                    <Select value={newFolderId} onValueChange={setNewFolderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__root__">
                          Root / All Media
                        </SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Delete Confirmation */}
                {operation === "delete" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Permanent Deletion</span>
                    </div>
                    <p className="text-sm text-red-700">
                      This will permanently delete {selectedMediaIds.length}{" "}
                      file(s). This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleOperation}
              disabled={loading || !operation}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {operation === "change_type" && "Change Type"}
                  {operation === "change_folder" && "Move Files"}
                  {operation === "delete" && "Delete Files"}
                  {!operation && "Select Operation"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "@hono/auth-js/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  X,
  Folder,
  FolderPlus,
  Save,
  AlertCircle,
  Edit3,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  description?: string;
  media_count: number | string; // Allow both for safety during conversion
  children_count: number | string; // Allow both for safety during conversion
}

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
  onFolderUpdated: () => void;
  mode: "create" | "edit";
  folder?: MediaFolder;
  parentId?: string;
  folders: MediaFolder[];
}

export default function FolderModal({
  isOpen,
  onClose,
  onFolderCreated,
  onFolderUpdated,
  mode,
  folder,
  parentId,
  folders,
}: FolderModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("__root__");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`FolderModal API Error on ${url}:`, error);
      // Let component handle error display
    },
  });

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && folder) {
        setName(folder.name);
        setDescription(folder.description || "");
        setSelectedParentId(folder.parent_id || "__root__");
      } else {
        setName("");
        setDescription("");
        setSelectedParentId(parentId || "__root__");
      }
      setError("");
    }
  }, [isOpen, mode, folder, parentId]);

  const validateForm = () => {
    if (!name.trim()) {
      setError("Folder name is required");
      return false;
    }

    if (name.trim().length < 2) {
      setError("Folder name must be at least 2 characters");
      return false;
    }

    // Check for duplicate names in same parent
    const siblings = folders.filter(
      (f) => f.parent_id === selectedParentId && f.id !== folder?.id // Exclude current folder when editing
    );

    if (
      siblings.some((f) => f.name.toLowerCase() === name.trim().toLowerCase())
    ) {
      setError("A folder with this name already exists in the same location");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const url =
        mode === "create"
          ? "/api/admin/media/folders"
          : `/api/admin/media/folders/${folder?.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const body = {
        name: name.trim(),
        description: description.trim() || null,
        parent_id: selectedParentId === "__root__" ? null : selectedParentId,
      };

      await apiCallJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success(
        mode === "create"
          ? "Folder created successfully"
          : "Folder updated successfully"
      );

      if (mode === "create") {
        onFolderCreated();
      } else {
        onFolderUpdated();
      }

      onClose();
    } catch (err: unknown) {
      // Error already handled by useAuthenticatedFetch interceptor
      console.error(`Failed to ${mode} folder:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${mode} folder`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Build parent folder options (exclude current folder and its descendants)
  const getAvailableParents = () => {
    if (mode === "create") {
      return folders;
    }

    // For edit mode, exclude current folder and its descendants
    const isDescendant = (
      checkFolder: MediaFolder,
      ancestorId: string
    ): boolean => {
      if (checkFolder.id === ancestorId) return true;
      if (!checkFolder.parent_id) return false;
      const parent = folders.find((f) => f.id === checkFolder.parent_id);
      return parent ? isDescendant(parent, ancestorId) : false;
    };

    return folders.filter((f) => !isDescendant(f, folder?.id || ""));
  };

  const availableParents = getAvailableParents();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 w-full max-w-md animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
              {mode === "create" ? (
                <FolderPlus className="w-6 h-6 text-blue-600" />
              ) : (
                <Edit3 className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {mode === "create" ? "Create New Folder" : "Edit Folder"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {mode === "create"
                  ? "Organize your media files with folders"
                  : "Update folder information"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Folder Name */}
          <div>
            <label
              htmlFor="folder-name"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Folder Name *
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Parent Folder */}
          <div>
            <label
              htmlFor="parent-folder"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Parent Folder
            </label>
            <Select
              value={selectedParentId}
              onValueChange={(value: string) => setSelectedParentId(value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="📁 Root (No parent)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">📁 Root (No parent)</SelectItem>
                {availableParents.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.parent_id ? "📂" : "📁"} {f.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="folder-description"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Description
            </label>
            <textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this folder"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm resize-none"
              disabled={loading}
            />
          </div>

          {/* Preview Path */}
          {(selectedParentId !== "__root__" || name) && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs font-medium text-gray-700 mb-1">
                Preview Path:
              </div>
              <div className="text-sm text-gray-900 font-medium">
                {selectedParentId !== "__root__"
                  ? `${
                      folders.find((f) => f.id === selectedParentId)?.path || ""
                    }/${name || "[folder-name]"}`
                  : name || "[folder-name]"}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                ? "Create Folder"
                : "Update Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

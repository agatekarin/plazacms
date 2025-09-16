"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "@hono/auth-js/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  description?: string;
  media_count: number;
  children_count: number;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  media_id?: string;
  preview?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: MediaFolder[];
  selectedFolder?: string | null;
  onUploadComplete: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  folders,
  selectedFolder,
  onUploadComplete,
}: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [targetFolder, setTargetFolder] = useState<string>(
    selectedFolder || "__root__"
  );
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  // Generate unique ID for files
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Handle file selection
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadFile[] = [];

    fileArray.forEach((file) => {
      // Validate file type (basic check)
      const validTypes = ["image/", "video/", "audio/", "application/pdf"];
      const isValid = validTypes.some((type) => file.type.startsWith(type));

      if (!isValid) {
        alert(
          `Invalid file type: ${file.name}. Please upload images, videos, audio, or PDF files.`
        );
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }

      const uploadFile: UploadFile = {
        file,
        id: generateId(),
        progress: 0,
        status: "pending",
      };

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, preview: e.target?.result as string }
                : f
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newUploadFiles.push(uploadFile);
    });

    setUploadFiles((prev) => [...prev, ...newUploadFiles]);
  }, []);

  // Drag and drop handlers
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

  // File input handler
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Remove file from upload list
  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Upload single file
  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        // Update status to uploading
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "uploading" as const, progress: 0 }
              : f
          )
        );

        const formData = new FormData();
        formData.append("file", uploadFile.file);
        formData.append("media_type", "other"); // Default type
        if (targetFolder && targetFolder !== "__root__") {
          formData.append("folder_id", targetFolder);
        }
        // entity_id will be set when uploading from specific contexts (product editor, etc.)
        // For general media manager uploads, entity_id remains null

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Progress handler
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f))
            );
          }
        });

        // Response handler
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id
                    ? {
                        ...f,
                        status: "completed" as const,
                        progress: 100,
                        media_id: response.media?.id,
                      }
                    : f
                )
              );
            } catch (err) {
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id
                    ? {
                        ...f,
                        status: "error" as const,
                        error: "Invalid response from server",
                      }
                    : f
                )
              );
            }
          } else {
            let errorMessage = "Upload failed";
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorMessage;
            } catch (err) {
              // Use default error message
            }

            setUploadFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? {
                      ...f,
                      status: "error" as const,
                      error: errorMessage,
                    }
                  : f
              )
            );
          }
          resolve();
        });

        // Error handler
        xhr.addEventListener("error", () => {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: "error" as const,
                    error: "Network error during upload",
                  }
                : f
            )
          );
          resolve();
        });

        // Start upload
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const url = base
          ? `${base}/api/admin/media/upload`
          : "/api/admin/media/upload";
        xhr.open("POST", url);

        // Add Authorization header
        if (session?.accessToken) {
          xhr.setRequestHeader(
            "Authorization",
            `Bearer ${session.accessToken}`
          );
        }

        xhr.send(formData);
      } catch (error) {
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: "Failed to start upload",
                }
              : f
          )
        );
        resolve();
      }
    });
  };

  // Upload all files
  const uploadAllFiles = async () => {
    setUploading(true);

    const pendingFiles = uploadFiles.filter((f) => f.status === "pending");

    // Upload files in parallel (max 3 concurrent)
    const batchSize = 3;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(uploadFile));
    }

    setUploading(false);

    // Check if all uploads completed successfully
    const finalFiles = uploadFiles.map((f) =>
      pendingFiles.find((pf) => pf.id === f.id) ? { ...f, status: f.status } : f
    );

    const hasCompleted = finalFiles.some((f) => f.status === "completed");
    if (hasCompleted) {
      onUploadComplete();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType.startsWith("video/")) return "🎥";
    if (fileType.startsWith("audio/")) return "🎵";
    if (fileType.includes("pdf")) return "📄";
    return "📁";
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending":
        return "text-gray-500";
      case "uploading":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  if (!isOpen) return null;

  const allCompleted =
    uploadFiles.length > 0 &&
    uploadFiles.every((f) => f.status === "completed");
  const hasErrors = uploadFiles.some((f) => f.status === "error");
  const canUpload =
    uploadFiles.length > 0 &&
    !uploading &&
    uploadFiles.some((f) => f.status === "pending");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in-0 duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Upload Media</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Target Folder
            </label>
            <Select
              value={targetFolder}
              onValueChange={(value: string) => setTargetFolder(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Root / All Media" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Root / All Media</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.path} ({folder.media_count} files)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <div className="text-4xl">📁</div>
              <div className="font-medium">
                Drag and drop files here, or{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  browse
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Supports images, videos, audio, and PDF files (max 10MB each)
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">
                Files to Upload ({uploadFiles.length})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-md"
                  >
                    {/* Preview/Icon */}
                    <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      {uploadFile.preview ? (
                        <img
                          src={uploadFile.preview}
                          alt={uploadFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {getFileIcon(uploadFile.file.type)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {uploadFile.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </div>

                      {/* Progress Bar */}
                      {uploadFile.status === "uploading" && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error Message */}
                      {uploadFile.status === "error" && uploadFile.error && (
                        <div className="text-xs text-red-600 mt-1">
                          {uploadFile.error}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div
                      className={`text-xs font-medium ${getStatusColor(
                        uploadFile.status
                      )}`}
                    >
                      {uploadFile.status === "pending" && "Pending"}
                      {uploadFile.status === "uploading" &&
                        `${uploadFile.progress}%`}
                      {uploadFile.status === "completed" && "✓ Done"}
                      {uploadFile.status === "error" && "✗ Error"}
                    </div>

                    {/* Remove Button */}
                    {uploadFile.status === "pending" && (
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {uploadFiles.length === 0 && "No files selected"}
            {uploadFiles.length > 0 &&
              !uploading &&
              `${uploadFiles.length} files ready`}
            {uploading && "Uploading..."}
            {allCompleted && "All uploads completed!"}
            {hasErrors && "Some uploads failed"}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              {allCompleted ? "Close" : "Cancel"}
            </button>

            {canUpload && (
              <button
                onClick={uploadAllFiles}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

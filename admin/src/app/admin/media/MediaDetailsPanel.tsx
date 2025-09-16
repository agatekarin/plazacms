"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { MediaOptimizer } from "@/lib/media-optimizer";
import {
  X,
  Info,
  FileText,
  Copy,
  ExternalLink,
  Download,
  Link as LinkIcon,
  Sparkles,
  Type,
  Tag,
  Folder,
  Trash2,
  Save,
  File,
  Calendar,
  User,
  HardDrive,
  Image as ImageIcon,
  Video as VideoIcon,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  description?: string;
  media_count: number;
  children_count: number;
}

interface MediaDetailsPanelProps {
  media: MediaItem | null;
  folders: MediaFolder[];
  isOpen: boolean;
  onClose: () => void;
  onMediaUpdate: (updatedMedia: MediaItem) => void;
  onMediaDelete: (mediaId: string) => void;
}

export default function MediaDetailsPanel({
  media,
  folders,
  isOpen,
  onClose,
  onMediaUpdate,
  onMediaDelete,
}: MediaDetailsPanelProps) {
  // Form state
  const [formData, setFormData] = useState({
    alt_text: "",
    media_type: "other",
    folder_id: "__root__",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { data: session } = useSession();

  // Enhanced API Helper with global error handling
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`MediaDetailsPanel API Error on ${url}:`, error);
      // Let component handle error display
    },
  });

  // Update form when media changes
  useEffect(() => {
    if (media) {
      setFormData({
        alt_text: media.alt_text || "",
        media_type: media.media_type || "other",
        folder_id: media.folder_id || "__root__",
      });
      setError("");
      setSuccess("");
    }
  }, [media]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // Get file type display name
  const getFileTypeDisplay = (fileType: string): string => {
    const types: { [key: string]: string } = {
      "image/jpeg": "JPEG Image",
      "image/png": "PNG Image",
      "image/gif": "GIF Image",
      "image/webp": "WebP Image",
      "image/svg+xml": "SVG Vector",
      "video/mp4": "MP4 Video",
      "video/webm": "WebM Video",
      "video/quicktime": "QuickTime Video",
      "audio/mpeg": "MP3 Audio",
      "audio/wav": "WAV Audio",
      "audio/ogg": "OGG Audio",
      "application/pdf": "PDF Document",
    };
    return types[fileType] || fileType;
  };

  // Get media type options
  const mediaTypeOptions = [
    { value: "product_image", label: "Product Image" },
    { value: "product_variant_image", label: "Product Variant Image" },
    { value: "user_profile", label: "User Profile Picture" },
    { value: "review_image", label: "Review Image" },
    { value: "site_asset", label: "Site Asset" },
    { value: "other", label: "Other" },
  ];

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  // Save media metadata
  const handleSave = async () => {
    if (!media) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Convert __root__ back to null for backend
      const dataToSend = {
        ...formData,
        folder_id:
          formData.folder_id === "__root__" ? null : formData.folder_id,
      };

      const data = await apiCallJson(`/api/admin/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (data.success) {
        setSuccess("Media updated successfully");
        onMediaUpdate({ ...media, ...formData });
      } else {
        setError(data.error || "Failed to update media");
      }
    } catch (err) {
      // Error already handled by useAuthenticatedFetch interceptor
      setError("Failed to update media");
      console.error("Media update error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Delete media
  const handleDelete = async () => {
    if (!media) return;

    if (
      !confirm(
        `Are you sure you want to delete "${media.filename}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await apiCallJson(`/api/admin/media/${media.id}`, {
        method: "DELETE",
      });

      onMediaDelete(media.id);
      onClose();
    } catch (err) {
      // Error already handled by useAuthenticatedFetch interceptor
      setError("Failed to delete media");
      console.error("Media delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Copy URL to clipboard
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  if (!isOpen || !media) return null;

  const isImage = media.file_type.startsWith("image/");
  const isVideo = media.file_type.startsWith("video/");
  const hasChanges =
    formData.alt_text !== (media.alt_text || "") ||
    formData.media_type !== media.media_type ||
    formData.folder_id !== (media.folder_id || "__root__");

  const renderInfoRow = (
    icon: React.ReactNode,
    label: string,
    value: string | React.ReactNode
  ) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm text-gray-900 font-medium text-right max-w-[60%] truncate">
        {value}
      </div>
    </div>
  );

  const renderUrlRow = (label: string, url: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={url}
          readOnly
          className="h-9 text-xs font-mono"
        />
        <Button variant="outline" size="sm" onClick={() => copyUrl(url)}>
          <Copy size={14} />
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <span>
              <ExternalLink size={14} />
            </span>
          </a>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-gray-200/80 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/80 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Media Details</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Media Preview */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200/80 shadow-sm">
            {isImage ? (
              <img
                src={media.file_url}
                alt={media.alt_text || media.filename}
                className="w-full h-full object-contain"
              />
            ) : isVideo ? (
              <video
                src={media.file_url}
                className="w-full h-full object-contain bg-black"
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-50">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto text-gray-400" />
                  <div className="mt-4 text-sm font-medium text-gray-600">
                    {getFileTypeDisplay(media.file_type)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-center">
            <p
              className="text-base font-semibold text-gray-900 truncate"
              title={media.filename}
            >
              {media.filename}
            </p>
          </div>
        </div>

        {/* File Information Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Information
          </h3>
          <div className="space-y-3 rounded-lg border border-gray-200/80 p-4">
            {renderInfoRow(
              <HardDrive size={14} />,
              "Size",
              formatFileSize(media.size)
            )}
            {renderInfoRow(
              <File size={14} />,
              "Type",
              getFileTypeDisplay(media.file_type)
            )}
            {renderInfoRow(
              <Calendar size={14} />,
              "Uploaded",
              formatDate(media.created_at)
            )}
            {media.uploaded_by_name &&
              renderInfoRow(
                <User size={14} />,
                "Uploader",
                media.uploaded_by_name
              )}
            {renderInfoRow(
              <Folder size={14} />,
              "Folder",
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium">
                {media.folder_name || "Root"}
              </span>
            )}
          </div>
        </div>

        {/* URL Actions Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <LinkIcon size={14} /> File URL
          </h3>
          <div className="space-y-3">
            {renderUrlRow("Original URL", media.file_url)}
            <div className="flex gap-2 pt-2">
              <Button asChild variant="secondary" className="flex-1">
                <a
                  href={media.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="flex items-center">
                    <ExternalLink size={16} className="mr-2" /> View Original
                  </span>
                </a>
              </Button>
              <Button asChild variant="secondary" className="flex-1">
                <a href={media.file_url} download={media.filename}>
                  <span className="flex items-center">
                    <Download size={16} className="mr-2" /> Download
                  </span>
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Cloudinary URLs Section */}
        {media.file_type.startsWith("image/") && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} /> Optimized URLs
            </h3>
            <div className="space-y-4">
              {renderUrlRow(
                "Thumbnail (150x150)",
                MediaOptimizer.getOptimizedUrl(media.file_url, {
                  width: 150,
                  height: 150,
                  crop: "fill",
                  quality: 80,
                })
              )}
              {renderUrlRow(
                "Medium (300x300)",
                MediaOptimizer.getOptimizedUrl(media.file_url, {
                  width: 300,
                  height: 300,
                  crop: "fill",
                  quality: 80,
                })
              )}
              {renderUrlRow(
                "Product Card (400x400)",
                MediaOptimizer.getOptimizedUrl(media.file_url, {
                  width: 400,
                  height: 400,
                  crop: "fill",
                  quality: 85,
                })
              )}
              {renderUrlRow(
                "Gallery (800x600)",
                MediaOptimizer.getOptimizedUrl(media.file_url, {
                  width: 800,
                  height: 600,
                  crop: "fill",
                  quality: 90,
                })
              )}
            </div>
          </div>
        )}

        {/* Edit Form Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Edit Details
          </h3>
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Type size={14} /> Alt Text
              </label>
              <Textarea
                value={formData.alt_text}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  handleInputChange("alt_text", e.target.value)
                }
                placeholder="Describe this media for accessibility..."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Used for screen readers and when the image fails to load.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Tag size={14} /> Media Type
              </label>
              <Select
                value={formData.media_type}
                onValueChange={(value: string) =>
                  handleInputChange("media_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select media type" />
                </SelectTrigger>
                <SelectContent>
                  {mediaTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Folder size={14} /> Folder
              </label>
              <Select
                value={formData.folder_id}
                onValueChange={(value: string) =>
                  handleInputChange("folder_id", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
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

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200/80 p-4 bg-gray-50/50">
        <div className="flex justify-between items-center">
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={16} className="mr-2" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>

            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

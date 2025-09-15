"use client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_id?: string;
  image_url?: string;
  image_alt?: string; 
  created_at: string;
}
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

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Plus,
  Tag,
  Calendar,
  Edit3,
  X,
  Image,
  FileText,
} from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import toast from "react-hot-toast";

export default function CategoriesManager({
  initialItems,
}: {
  initialItems?: Category[];
}) {
  const [items, setItems] = useState<Category[]>(
    Array.isArray(initialItems) ? initialItems : []
  );
  const [showModal, setShowModal] = useState<null | {
    mode: "add" | "edit";
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    image_id?: string;
    image_url?: string;
  }>(null);

  async function reload() {
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      const d = await res.json();
      setItems(Array.isArray(d.items) ? (d.items as Category[]) : []);
    } catch (e) {
      setItems([]);
    }
  }

  useEffect(() => {
    if (!initialItems) void reload();
  }, []);

  return (
    <div className="space-y-6">
      {/* Add Category Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowModal({ mode: "add" })}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <Th>Category</Th>
                <Th>Slug</Th>
                <Th>Description</Th>
                <Th>Image</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Tag className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium">No categories found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Create your first category to organize products
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c: Category) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <Td>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                          <Tag className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {c.name}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            Category
                          </Badge>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-mono text-sm text-gray-600">
                        {c.slug}
                      </span>
                    </Td>
                    <Td>
                      <div className="max-w-xs">
                        {c.description ? (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 line-clamp-2">
                              {c.description}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No description
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-center">
                        {c.image_url ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={c.image_url}
                              alt={c.image_alt || c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Image className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() =>
                            setShowModal({
                              mode: "edit",
                              id: c.id,
                              name: c.name,
                              slug: c.slug,
                              description: c.description || "",
                              image_id: c.image_id,
                              image_url: c.image_url,
                            })
                          }
                          title="Edit category"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <DeleteCategoryButton id={c.id} onDeleted={reload} />
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <Modal
          title={
            showModal.mode === "add" ? "Add New Category" : "Edit Category"
          }
          onClose={() => setShowModal(null)}
        >
          <CategoryForm
            mode={showModal.mode}
            id={showModal.id}
            name={showModal.name || ""}
            slug={showModal.slug || ""}
            description={showModal.description || ""}
            image_id={showModal.image_id}
            image_url={showModal.image_url}
            onDone={() => {
              setShowModal(null);
              void reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 whitespace-nowrap">{children}</td>;
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in-0 duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function CategoryForm({
  mode,
  id,
  name,
  slug,
  description,
  image_id,
  image_url,
  onDone,
}: {
  mode: "add" | "edit";
  id?: string;
  name: string;
  slug: string;
  description: string;
  image_id?: string;
  image_url?: string;
  onDone: () => void;
}) {
  const [nameVal, setNameVal] = useState(name);
  const [slugVal, setSlugVal] = useState(slug);
  const [descriptionVal, setDescriptionVal] = useState(description);
  const [imageIdVal, setImageIdVal] = useState(image_id);
  const [imageUrlVal, setImageUrlVal] = useState(image_url);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleNameChange = (value: string) => {
    setNameVal(value);
    if (mode === "add") {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlugVal(autoSlug);
    }
  };

  const handleMediaSelect = (media: MediaItem[]) => {
    if (media.length > 0) {
      const selectedMedia = media[0];
      setImageIdVal(selectedMedia.id);
      setImageUrlVal(selectedMedia.file_url);
    }
    setShowMediaPicker(false);
  };

  const removeImage = () => {
    setImageIdVal(undefined);
    setImageUrlVal(undefined);
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            if (mode === "add") {
              const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: nameVal,
                  slug: slugVal,
                  description: descriptionVal || null,
                  image_id: imageIdVal || null,
                }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                toast.error(j.error || "Failed to create category");
                return;
              }
            } else if (mode === "edit" && id) {
              const res = await fetch(`/api/admin/categories/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: nameVal,
                  slug: slugVal,
                  description: descriptionVal || null,
                  image_id: imageIdVal || null,
                }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                toast.error(j.error || "Failed to update category");
                return;
              }
            }
            router.refresh();
            onDone();
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Category Name
          </label>
          <Input
            value={nameVal}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Electronics, Clothing, Books"
            required
          />
          <p className="text-xs text-gray-500">
            This will be displayed to customers
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">URL Slug</label>
          <Input
            value={slugVal}
            onChange={(e) => setSlugVal(e.target.value)}
            placeholder="e.g., electronics, clothing, books"
            required
          />
          <p className="text-xs text-gray-500">
            Used in URLs. Only lowercase letters, numbers, and hyphens.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={descriptionVal}
            onChange={(e) => setDescriptionVal(e.target.value)}
            placeholder="Brief description of this category..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500">
            Optional description to help customers understand this category
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Category Image
          </label>
          {imageUrlVal ? (
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageUrlVal}
                  alt="Category preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMediaPicker(true)}
              className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
            >
              <Image className="h-6 w-6 mb-1" />
              <span className="text-xs">Add Image</span>
            </button>
          )}
          <p className="text-xs text-gray-500">
            Optional image to represent this category
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !nameVal.trim() || !slugVal.trim()}
          >
            {isPending
              ? "Saving..."
              : mode === "add"
              ? "Create Category"
              : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* MediaPicker Outside Form */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-[60]">
          <MediaPicker
            mode="single"
            mediaType="product_image"
            selectedMedia={[]}
            onSelect={handleMediaSelect}
            onClose={() => setShowMediaPicker(false)}
            autoCreateFolder="categories"
          />
        </div>
      )}
    </>
  );
}

function DeleteCategoryButton({ id, onDeleted }: { id: string; onDeleted?: () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
      title="Delete category"
      onClick={() => {
        if (!confirm("Delete this category? This action cannot be undone."))
          return;
        startTransition(async () => {
          const res = await fetch(`/api/admin/categories/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            if (onDeleted) onDeleted();
          }
          else {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error || "Failed to delete category");
          }
        });
      }}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

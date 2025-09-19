"use client";

import { useState, useEffect } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  featured_image_url?: string;
  variants?: Variant[];
}

interface Variant {
  id: string;
  product_name?: string;
  attributes?: { name: string; value: string }[];
  regular_price?: number;
  sale_price?: number;
  stock?: number;
  sku?: string;
  image_url?: string;
}

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (
    items: {
      product_name: string;
      product_price: number;
      quantity: number;
      product_variant_id: string;
      variant_sku?: string;
    }[]
  ) => void;
}

export default function ProductPickerModal({
  isOpen,
  onClose,
  onAddItems,
}: ProductPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    Map<string, { variant: Variant; quantity: number; product: Product }>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const { apiCallJson } = useAuthenticatedFetch();

  // Fetch products based on search query
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }
        params.set("pageSize", "20");

        const data = await apiCallJson(
          `/api/admin/products?${params.toString()}`,
          { signal: controller.signal }
        );

        setProducts(data.items || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch products:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchProducts, 300);
    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [searchQuery, isOpen]);

  // Fetch variants for expanded product
  const fetchVariants = async (productId: string) => {
    try {
      const data = await apiCallJson(
        `/api/admin/products/${productId}/variants`
      );
      const variants = data.items || [];

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, variants } : p))
      );
    } catch (error) {
      console.error("Failed to fetch variants:", error);
    }
  };

  const handleProductExpand = (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
      fetchVariants(productId);
    }
  };

  const handleAddVariant = (variant: Variant, product: Product) => {
    const key = variant.id;
    const current = selectedItems.get(key);

    if (current) {
      // Increase quantity
      setSelectedItems(
        new Map(
          selectedItems.set(key, {
            ...current,
            quantity: current.quantity + 1,
          })
        )
      );
    } else {
      // Add new item
      setSelectedItems(
        new Map(
          selectedItems.set(key, {
            variant,
            product,
            quantity: 1,
          })
        )
      );
    }
  };

  const handleRemoveItem = (variantId: string) => {
    const newItems = new Map(selectedItems);
    newItems.delete(variantId);
    setSelectedItems(newItems);
  };

  const handleQuantityChange = (variantId: string, quantity: number) => {
    const current = selectedItems.get(variantId);
    if (current && quantity > 0) {
      setSelectedItems(
        new Map(
          selectedItems.set(variantId, {
            ...current,
            quantity,
          })
        )
      );
    } else if (quantity <= 0) {
      handleRemoveItem(variantId);
    }
  };

  const handleAddToOrder = () => {
    const items = Array.from(selectedItems.values()).map(
      ({ variant, quantity, product }) => ({
        product_name: variant.product_name || product.name,
        product_price: Number(variant.sale_price ?? variant.regular_price ?? 0),
        quantity,
        product_variant_id: variant.id,
        variant_sku: variant.sku,
      })
    );

    onAddItems(items);
    setSelectedItems(new Map());
    setSearchQuery("");
    onClose();
  };

  const totalSelectedItems = Array.from(selectedItems.values()).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Add Products to Order</h2>
            <p className="text-sm text-gray-500 mt-1">
              Search and select products to add to this order
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Products List */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">Searching products...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">
                  {searchQuery
                    ? "No products found"
                    : "Start typing to search products"}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    {/* Product Header */}
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleProductExpand(product.id)}
                    >
                      {product.featured_image_url ? (
                        <img
                          src={product.featured_image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border flex items-center justify-center">
                          <span className="text-xs text-gray-500">
                            No image
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">
                          Click to view variants
                        </p>
                      </div>

                      <div className="text-sm text-gray-400">
                        {expandedProduct === product.id ? "▼" : "▶"}
                      </div>
                    </div>

                    {/* Variants (when expanded) */}
                    {expandedProduct === product.id && (
                      <div className="border-t bg-gray-50">
                        {product.variants ? (
                          <div className="p-4 space-y-3">
                            {product.variants.map((variant) => {
                              const price = Number(
                                variant.sale_price ?? variant.regular_price ?? 0
                              );
                              const isSelected = selectedItems.has(variant.id);
                              const selectedItem = selectedItems.get(
                                variant.id
                              );

                              return (
                                <div
                                  key={variant.id}
                                  className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                                >
                                  {variant.image_url && (
                                    <img
                                      src={variant.image_url}
                                      alt="variant"
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">
                                      {variant.attributes
                                        ?.map((attr) => attr.value)
                                        .join(" • ") ||
                                        variant.sku ||
                                        "Default"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ${price.toFixed(2)}
                                      {variant.stock !== undefined && (
                                        <span className="ml-2">
                                          Stock: {variant.stock}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isSelected ? (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleQuantityChange(
                                              variant.id,
                                              (selectedItem?.quantity ?? 1) - 1
                                            )
                                          }
                                        >
                                          -
                                        </Button>
                                        <span className="w-8 text-center text-sm">
                                          {selectedItem?.quantity ?? 0}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleQuantityChange(
                                              variant.id,
                                              (selectedItem?.quantity ?? 0) + 1
                                            )
                                          }
                                        >
                                          +
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleAddVariant(variant, product)
                                        }
                                      >
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        Add
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Loading variants...
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items Sidebar */}
          {selectedItems.size > 0 && (
            <div className="w-80 border-l bg-gray-50 flex flex-col">
              <div className="p-4 border-b bg-white">
                <h3 className="font-medium">
                  Selected Items ({totalSelectedItems})
                </h3>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {Array.from(selectedItems.entries()).map(
                  ([variantId, { variant, quantity, product }]) => {
                    const price = Number(
                      variant.sale_price ?? variant.regular_price ?? 0
                    );
                    return (
                      <div
                        key={variantId}
                        className="bg-white p-3 rounded-lg border"
                      >
                        <div className="flex items-start gap-3">
                          {variant.image_url && (
                            <img
                              src={variant.image_url}
                              alt="variant"
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {variant.attributes
                                ?.map((attr) => attr.value)
                                .join(" • ") ||
                                variant.sku ||
                                "Default"}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {quantity} × ${price.toFixed(2)} = $
                              {(quantity * price).toFixed(2)}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(variantId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {totalSelectedItems} item{totalSelectedItems !== 1 ? "s" : ""}{" "}
            selected
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToOrder}
              disabled={selectedItems.size === 0}
            >
              Add to Order ({totalSelectedItems})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

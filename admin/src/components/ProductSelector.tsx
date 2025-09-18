"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Package, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface Product {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  currency: string;
  featured_image_url?: string;
  status: string;
  sku?: string;
  stock: number;
}

interface ProductSelectorProps {
  selectedProducts: string[];
  onSelectionChange: (productIds: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
}

export function ProductSelector({
  selectedProducts,
  onSelectionChange,
  placeholder = "Select products...",
  maxSelections,
  className = "",
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { apiCallJson } = useAuthenticatedFetch();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson("/api/admin/products?pageSize=1000", {
        cache: "no-store",
      });
      setProducts(data.items || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson]);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Get selected product objects
  const selectedProductObjects = useMemo(() => {
    return products.filter((product) => selectedProducts.includes(product.id));
  }, [products, selectedProducts]);

  const handleProductToggle = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      // Remove product
      onSelectionChange(selectedProducts.filter((id) => id !== productId));
    } else {
      // Add product (check max selections)
      if (maxSelections && selectedProducts.length >= maxSelections) {
        return;
      }
      onSelectionChange([...selectedProducts, productId]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    onSelectionChange(selectedProducts.filter((id) => id !== productId));
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Products Display */}
      {selectedProductObjects.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Selected Products ({selectedProductObjects.length}
            {maxSelections && `/${maxSelections}`})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedProductObjects.map((product) => (
              <Badge
                key={product.id}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span className="text-xs">{product.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(product.id)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Product Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="truncate">
                {selectedProductObjects.length > 0
                  ? `${selectedProductObjects.length} product(s) selected`
                  : placeholder}
              </span>
            </div>
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search products..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <CommandEmpty>No products found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    const isDisabled = Boolean(
                      maxSelections &&
                        selectedProducts.length >= maxSelections &&
                        !isSelected
                    );

                    return (
                      <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={() => handleProductToggle(product.id)}
                        disabled={isDisabled}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* Product Image */}
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            {product.featured_image_url ? (
                              <OptimizedImage
                                src={product.featured_image_url}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {formatPrice(
                                product.regular_price,
                                product.currency
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {product.slug}
                            </div>
                          </div>

                          {/* Selection Indicator */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className="h-4 w-4 rounded border border-gray-300" />
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Max Selections Warning */}
      {maxSelections && selectedProducts.length >= maxSelections && (
        <div className="text-xs text-amber-600">
          Maximum {maxSelections} products can be selected.
        </div>
      )}
    </div>
  );
}

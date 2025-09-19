"use client";

import { useState } from "react";
import {
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface OrderItem {
  id?: string;
  product_name: string;
  product_price: number;
  quantity: number;
  product_variant_id: string;
  variant_sku?: string;
}

interface OrderItemCardProps {
  item: OrderItem;
  index: number;
  productImage?: string | null;
  variantLabel?: string;
  stock?: number;
  onUpdate: (index: number, field: keyof OrderItem, value: any) => void;
  onRemove: (index: number) => void;
  onChangeVariant?: (index: number) => void;
}

export default function OrderItemCard({
  item,
  index,
  productImage,
  variantLabel,
  stock,
  onUpdate,
  onRemove,
  onChangeVariant,
}: OrderItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(item.product_price.toString());

  const subtotal = item.quantity * item.product_price;
  const isLowStock = stock !== undefined && stock < item.quantity;
  const isOutOfStock = stock !== undefined && stock <= 0;

  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, item.quantity + change);
    onUpdate(index, "quantity", newQuantity);
  };

  const handleQuantityInput = (value: string) => {
    const quantity = parseInt(value) || 1;
    onUpdate(index, "quantity", Math.max(1, quantity));
  };

  const handlePriceEdit = () => {
    setIsEditingPrice(true);
    setTempPrice(item.product_price.toString());
  };

  const handlePriceSubmit = () => {
    const price = parseFloat(tempPrice) || 0;
    onUpdate(index, "product_price", Math.max(0, price));
    setIsEditingPrice(false);
  };

  const handlePriceCancel = () => {
    setTempPrice(item.product_price.toString());
    setIsEditingPrice(false);
  };

  return (
    <Card className="overflow-hidden">
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {productImage ? (
              <img
                src={productImage}
                alt={item.product_name}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 border flex items-center justify-center">
                <span className="text-xs text-gray-400">No image</span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {item.product_name || "Unnamed Product"}
                </h3>

                {variantLabel && (
                  <p className="text-sm text-gray-600 mt-1">{variantLabel}</p>
                )}

                {item.variant_sku && (
                  <p className="text-xs text-gray-500 mt-1">
                    SKU: {item.variant_sku}
                  </p>
                )}

                {/* Stock Warning */}
                {(isLowStock || isOutOfStock) && (
                  <div
                    className={`flex items-center gap-1 mt-2 text-xs ${
                      isOutOfStock ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    {isOutOfStock
                      ? "Out of stock"
                      : `Low stock: ${stock} available`}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quantity and Price Row */}
            <div className="flex items-center gap-4 mt-3">
              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Qty:
                </span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={item.quantity <= 1}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityInput(e.target.value)}
                    className="h-8 w-16 border-0 text-center p-0 focus:ring-0 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleQuantityChange(1)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">×</span>
                {isEditingPrice ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handlePriceSubmit();
                          if (e.key === "Escape") handlePriceCancel();
                        }}
                        className="h-8 w-20 pl-6 text-sm"
                        autoFocus
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handlePriceSubmit}
                      className="h-6 text-xs"
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handlePriceCancel}
                      className="h-6 text-xs"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={handlePriceEdit}
                    className="flex items-center gap-1 text-sm font-medium hover:text-blue-600 transition-colors"
                  >
                    ${item.product_price.toFixed(2)}
                    <PencilIcon className="h-3 w-3 opacity-50" />
                  </button>
                )}
              </div>

              {/* Subtotal */}
              <div className="ml-auto">
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    ${subtotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.quantity} × ${item.product_price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Product Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Product Details
              </h4>
              <div className="space-y-1 text-gray-600">
                <div>Product ID: {item.product_variant_id}</div>
                {item.variant_sku && <div>SKU: {item.variant_sku}</div>}
                {stock !== undefined && (
                  <div className={stock <= 10 ? "text-amber-600" : ""}>
                    Stock: {stock} available
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {onChangeVariant && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onChangeVariant(index)}
                  >
                    Change Variant
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handlePriceEdit}>
                  Edit Price
                </Button>
              </div>
            </div>
          </div>

          {/* Notes Section (for future enhancement) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Notes (optional)
            </label>
            <Input
              placeholder="Add notes for this item..."
              className="text-sm"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

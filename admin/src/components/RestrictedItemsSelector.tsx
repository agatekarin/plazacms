"use client";

import { useState } from "react";
import { Package, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductSelector } from "./ProductSelector";

interface RestrictedItemsSelectorProps {
  restrictedItems: string[];
  restrictedProducts: string[];
  onItemsChange: (items: string[]) => void;
  onProductsChange: (productIds: string[]) => void;
  className?: string;
}

export function RestrictedItemsSelector({
  restrictedItems,
  restrictedProducts,
  onItemsChange,
  onProductsChange,
  className = "",
}: RestrictedItemsSelectorProps) {
  const [newItem, setNewItem] = useState("");

  const addCustomItem = () => {
    if (newItem.trim() && !restrictedItems.includes(newItem.trim())) {
      onItemsChange([...restrictedItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeCustomItem = (index: number) => {
    onItemsChange(restrictedItems.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomItem();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Restricted Items</Label>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products ({restrictedProducts.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Custom Items ({restrictedItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          <div className="text-sm text-gray-600">
            Select specific products that cannot be shipped with this method.
          </div>
          <ProductSelector
            selectedProducts={restrictedProducts}
            onSelectionChange={onProductsChange}
            placeholder="Select restricted products..."
            maxSelections={50}
          />
        </TabsContent>

        {/* Custom Items Tab */}
        <TabsContent value="custom" className="space-y-3">
          <div className="text-sm text-gray-600">
            Add custom item types or categories that are restricted.
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add restricted item type (e.g., 'liquid', 'fragile', 'electronics')..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addCustomItem}
                disabled={!newItem.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Custom Items Display */}
            {restrictedItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Custom Restricted Items
                </div>
                <div className="flex flex-wrap gap-2">
                  {restrictedItems.map((item, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <span className="text-xs">{item}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomItem(index)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      {(restrictedItems.length > 0 || restrictedProducts.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Restriction Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-gray-600">
              This shipping method has{" "}
              <span className="font-medium text-amber-600">
                {restrictedItems.length + restrictedProducts.length}{" "}
                restrictions
              </span>
              :
            </div>
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              {restrictedProducts.length > 0 && (
                <li>• {restrictedProducts.length} specific product(s)</li>
              )}
              {restrictedItems.length > 0 && (
                <li>• {restrictedItems.length} custom item type(s)</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

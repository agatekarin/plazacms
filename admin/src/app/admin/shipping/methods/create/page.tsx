"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Scale,
  Clock,
  Settings,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Zone {
  id: string;
  code: string;
  name: string;
  status: string;
  priority: number;
}

interface Gateway {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
}

interface FormData {
  zone_id: string;
  gateway_id: string;
  name: string;
  method_type: "flat" | "weight_based" | "free_shipping" | "percentage";
  base_cost: number;
  currency: string;
  weight_unit: string;
  weight_threshold: number;
  cost_per_kg: number;
  min_free_threshold: number;
  max_free_weight: number;
  max_weight_limit: number;
  max_dimensions: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  restricted_items: string[];
  description: string;
  estimated_days_min: number;
  estimated_days_max: number;
  sort_order: number;
  status: "active" | "inactive";
}

export default function CreateShippingMethodPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { apiCallJson } = useAuthenticatedFetch();

  const [formData, setFormData] = useState<FormData>({
    zone_id: "",
    gateway_id: "",
    name: "",
    method_type: "flat",
    base_cost: 0,
    currency: "IDR",
    weight_unit: "g",
    weight_threshold: 1000,
    cost_per_kg: 0,
    min_free_threshold: 0,
    max_free_weight: 0,
    max_weight_limit: 30000,
    max_dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm",
    },
    restricted_items: [],
    description: "",
    estimated_days_min: 1,
    estimated_days_max: 7,
    sort_order: 0,
    status: "active",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);

      // Fetch zones and gateways in parallel
      const [zonesData, gatewaysData] = await Promise.all([
        apiCallJson("/api/admin/shipping/zones?limit=100", {
          cache: "no-store",
        }),
        apiCallJson("/api/admin/shipping/gateways?limit=100", {
          cache: "no-store",
        }),
      ]);

      setZones(zonesData.zones || []);
      setGateways(gatewaysData.gateways || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load zones and gateways");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.zone_id || !formData.gateway_id || !formData.name) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      await apiCallJson("/api/admin/shipping/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // Redirect to methods list
      router.push("/admin/shipping/methods");
    } catch (error) {
      console.error("Error creating method:", error);
      alert(error instanceof Error ? error.message : "Failed to create method");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (
    field: keyof FormData,
    value:
      | string
      | number
      | string[]
      | FormData["method_type"]
      | "active"
      | "inactive"
      | FormData["max_dimensions"]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addRestrictedItem = (item: string) => {
    if (item.trim() && !formData.restricted_items.includes(item.trim())) {
      updateFormData("restricted_items", [
        ...formData.restricted_items,
        item.trim(),
      ]);
    }
  };

  const removeRestrictedItem = (index: number) => {
    updateFormData(
      "restricted_items",
      formData.restricted_items.filter((_, i) => i !== index)
    );
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/shipping/methods">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Methods
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Create Shipping Method</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Configure the basic details of the shipping method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zone_id">Shipping Zone *</Label>
                  <Select
                    value={formData.zone_id}
                    onValueChange={(value: string) =>
                      updateFormData("zone_id", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones
                        .filter((zone) => zone.status === "active")
                        .map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{zone.code}</Badge>
                              {zone.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gateway_id">Gateway *</Label>
                  <Select
                    value={formData.gateway_id}
                    onValueChange={(value: string) =>
                      updateFormData("gateway_id", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      {gateways
                        .filter((gateway) => gateway.status === "active")
                        .map((gateway) => (
                          <SelectItem key={gateway.id} value={gateway.id}>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  gateway.type === "api"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {gateway.code}
                              </Badge>
                              {gateway.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Method Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  placeholder="e.g., Express Delivery, Standard Shipping"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="method_type">Method Type</Label>
                  <Select
                    value={formData.method_type}
                    onValueChange={(value: string) =>
                      updateFormData(
                        "method_type",
                        value as FormData["method_type"]
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="weight_based">Weight Based</SelectItem>
                      <SelectItem value="free_shipping">
                        Free Shipping
                      </SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: string) =>
                      updateFormData("status", value as "active" | "inactive")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    updateFormData("description", e.target.value)
                  }
                  placeholder="Optional description of the shipping method"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Configuration
              </CardTitle>
              <CardDescription>
                Set up the pricing rules for this method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base_cost">Base Cost</Label>
                  <Input
                    id="base_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_cost}
                    onChange={(e) =>
                      updateFormData(
                        "base_cost",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: string) =>
                      updateFormData("currency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">
                        IDR - Indonesian Rupiah
                      </SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.method_type === "weight_based" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost_per_kg">Cost per KG</Label>
                      <Input
                        id="cost_per_kg"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cost_per_kg}
                        onChange={(e) =>
                          updateFormData(
                            "cost_per_kg",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="weight_threshold">
                        Weight Threshold ({formData.weight_unit})
                      </Label>
                      <Input
                        id="weight_threshold"
                        type="number"
                        min="0"
                        value={formData.weight_threshold}
                        onChange={(e) =>
                          updateFormData(
                            "weight_threshold",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {(formData.method_type === "free_shipping" ||
                formData.method_type === "weight_based") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_free_threshold">
                      Min Free Threshold
                    </Label>
                    <Input
                      id="min_free_threshold"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.min_free_threshold}
                      onChange={(e) =>
                        updateFormData(
                          "min_free_threshold",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_free_weight">
                      Max Free Weight ({formData.weight_unit})
                    </Label>
                    <Input
                      id="max_free_weight"
                      type="number"
                      min="0"
                      value={formData.max_free_weight}
                      onChange={(e) =>
                        updateFormData(
                          "max_free_weight",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weight & Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Weight & Dimensions
              </CardTitle>
              <CardDescription>
                Configure weight and size limitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight_unit">Weight Unit</Label>
                  <Select
                    value={formData.weight_unit}
                    onValueChange={(value: string) =>
                      updateFormData("weight_unit", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max_weight_limit">
                    Max Weight Limit ({formData.weight_unit})
                  </Label>
                  <Input
                    id="max_weight_limit"
                    type="number"
                    min="0"
                    value={formData.max_weight_limit}
                    onChange={(e) =>
                      updateFormData(
                        "max_weight_limit",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <Label>
                  Maximum Dimensions ({formData.max_dimensions.unit})
                </Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Length"
                    value={formData.max_dimensions.length || 0}
                    onChange={(e) =>
                      updateFormData("max_dimensions", {
                        ...formData.max_dimensions,
                        length: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Width"
                    value={formData.max_dimensions.width || 0}
                    onChange={(e) =>
                      updateFormData("max_dimensions", {
                        ...formData.max_dimensions,
                        width: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Height"
                    value={formData.max_dimensions.height || 0}
                    onChange={(e) =>
                      updateFormData("max_dimensions", {
                        ...formData.max_dimensions,
                        height: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <Select
                    value={formData.max_dimensions.unit || "cm"}
                    onValueChange={(value: string) =>
                      updateFormData("max_dimensions", {
                        ...formData.max_dimensions,
                        unit: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Delivery & Settings
              </CardTitle>
              <CardDescription>
                Configure delivery timeframe and other settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_days_min">Min Delivery Days</Label>
                  <Input
                    id="estimated_days_min"
                    type="number"
                    min="0"
                    value={formData.estimated_days_min}
                    onChange={(e) =>
                      updateFormData(
                        "estimated_days_min",
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_days_max">Max Delivery Days</Label>
                  <Input
                    id="estimated_days_max"
                    type="number"
                    min="0"
                    value={formData.estimated_days_max}
                    onChange={(e) =>
                      updateFormData(
                        "estimated_days_max",
                        parseInt(e.target.value) || 7
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) =>
                    updateFormData("sort_order", parseInt(e.target.value) || 0)
                  }
                  placeholder="Lower numbers appear first"
                />
              </div>

              <div>
                <Label>Restricted Items</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add restricted item..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRestrictedItem(
                            (e.target as HTMLInputElement).value
                          );
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                  {formData.restricted_items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.restricted_items.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => removeRestrictedItem(index)}
                          className="cursor-pointer"
                        >
                          <Badge variant="secondary">{item} ×</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Method"}
          </Button>
        </div>
      </form>
    </div>
  );
}

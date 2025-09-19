"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Save } from "lucide-react";
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
import { RestrictedItemsSelector } from "@/components/RestrictedItemsSelector";

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
  restricted_products: string[];
  description: string;
  estimated_days_min: number;
  estimated_days_max: number;
  sort_order: number;
  status: "active" | "inactive";
}

export default function EditShippingMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
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
    max_dimensions: { length: 0, width: 0, height: 0, unit: "cm" },
    restricted_items: [],
    restricted_products: [],
    description: "",
    estimated_days_min: 1,
    estimated_days_max: 7,
    sort_order: 0,
    status: "active",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);

      const [methodData, zonesData, gatewaysData] = await Promise.all([
        apiCallJson(`/api/admin/shipping/methods/${resolvedParams.id}`, {
          cache: "no-store",
        }),
        apiCallJson("/api/admin/shipping/zones?limit=100", {
          cache: "no-store",
        }),
        apiCallJson("/api/admin/shipping/gateways?limit=100", {
          cache: "no-store",
        }),
      ]);

      const method = methodData.method;
      setFormData({
        zone_id: method.zone_id,
        gateway_id: method.gateway_id,
        name: method.name,
        method_type: method.method_type,
        base_cost: method.base_cost || 0,
        currency: method.currency || "IDR",
        weight_unit: method.weight_unit || "g",
        weight_threshold: method.weight_threshold || 1000,
        cost_per_kg: method.cost_per_kg || 0,
        min_free_threshold: method.min_free_threshold || 0,
        max_free_weight: method.max_free_weight || 0,
        max_weight_limit: method.max_weight_limit || 30000,
        max_dimensions: method.max_dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },
        restricted_items: method.restricted_items || [],
        restricted_products: method.restricted_products || [],
        description: method.description || "",
        estimated_days_min: method.estimated_days_min || 1,
        estimated_days_max: method.estimated_days_max || 7,
        sort_order: method.sort_order || 0,
        status: method.status || "active",
      });

      setZones(zonesData.zones || []);
      setGateways(gatewaysData.gateways || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load method data");
      router.push("/admin/shipping/methods");
    } finally {
      setLoadingData(false);
    }
  }, [apiCallJson, resolvedParams.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.zone_id || !formData.gateway_id || !formData.name) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      await apiCallJson(`/api/admin/shipping/methods/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      router.push(`/admin/shipping/methods/${resolvedParams.id}`);
    } catch (error) {
      console.error("Error updating method:", error);
      alert(error instanceof Error ? error.message : "Failed to update method");
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
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        <Link href={`/admin/shipping/methods/${resolvedParams.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Method
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Edit Shipping Method</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information - Same as create form but with values populated */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
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

          {/* Pricing Configuration - Same structure as create form */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Configuration</CardTitle>
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

          {/* Weight & Dimensions and Delivery sections same as create form... */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Settings</CardTitle>
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
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <RestrictedItemsSelector
                restrictedItems={formData.restricted_items}
                restrictedProducts={formData.restricted_products}
                onItemsChange={(items) =>
                  updateFormData("restricted_items", items)
                }
                onProductsChange={(products) =>
                  updateFormData("restricted_products", products)
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6">
          <Link href={`/admin/shipping/methods/${resolvedParams.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Updating..." : "Update Method"}
          </Button>
        </div>
      </form>
    </div>
  );
}

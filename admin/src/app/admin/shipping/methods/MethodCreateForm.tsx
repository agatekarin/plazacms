"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  X,
  Plus,
  Trash2,
  Package,
  DollarSign,
  Weight,
  Gift,
  Save,
  Loader,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Carrier {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface WeightTier {
  max_weight: number;
  cost: number;
  extra_cost_per_kg: number;
}

interface FreeShippingRule {
  min_order_amount: number;
  description: string;
  is_active: boolean;
}

interface MethodCreateFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editMethod?: any;
}

export function MethodCreateForm({
  onClose,
  onSuccess,
  editMethod,
}: MethodCreateFormProps) {
  const { apiCallJson } = useAuthenticatedFetch();
  const [formData, setFormData] = useState({
    name: editMethod?.name || "",
    description: editMethod?.description || "",
    type: editMethod?.type || "flat",
    status: editMethod?.status || "active",
    carrier_id: editMethod?.carrier_id || "",
    cost: editMethod?.cost || 0,
    min_free_threshold: editMethod?.min_free_threshold || 0,
    weight_limit: editMethod?.weight_limit || 1000,
  });

  const [weightTiers, setWeightTiers] = useState<WeightTier[]>([
    { max_weight: 1000, cost: 10000, extra_cost_per_kg: 5000 },
  ]);

  const [freeShippingRules, setFreeShippingRules] = useState<
    FreeShippingRule[]
  >([
    {
      min_order_amount: 100000,
      description: "Free shipping for orders above Rp 100.000",
      is_active: true,
    },
  ]);

  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCarriers, setLoadingCarriers] = useState(true);

  // Load carriers on mount
  useEffect(() => {
    loadCarriers();
  }, []);

  const loadCarriers = async () => {
    try {
      setLoadingCarriers(true);
      const data = await apiCallJson("/api/admin/shipping/carriers", {
        cache: "no-store",
      });
      setCarriers(data.carriers || []);
    } catch (err) {
      console.error("Failed to load carriers:", err);
      setError("Failed to load carriers");
    } finally {
      setLoadingCarriers(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addWeightTier = () => {
    setWeightTiers((prev) => [
      ...prev,
      {
        max_weight: Math.max(...prev.map((t) => t.max_weight)) + 1000,
        cost: 15000,
        extra_cost_per_kg: 5000,
      },
    ]);
  };

  const updateWeightTier = (
    index: number,
    field: keyof WeightTier,
    value: number
  ) => {
    setWeightTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier))
    );
  };

  const removeWeightTier = (index: number) => {
    setWeightTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const addFreeShippingRule = () => {
    setFreeShippingRules((prev) => [
      ...prev,
      {
        min_order_amount: 50000,
        description: "",
        is_active: true,
      },
    ]);
  };

  const updateFreeShippingRule = (
    index: number,
    field: keyof FreeShippingRule,
    value: any
  ) => {
    setFreeShippingRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule))
    );
  };

  const removeFreeShippingRule = (index: number) => {
    setFreeShippingRules((prev) => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.carrier_id) {
      setError("Method name and carrier are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        weight_tiers: formData.type === "weight_based" ? weightTiers : [],
        free_shipping_rules: freeShippingRules.filter(
          (rule) => rule.min_order_amount > 0
        ),
      };

      const url = editMethod
        ? `/api/admin/shipping/methods/${editMethod.id}`
        : "/api/admin/shipping/methods";

      const method = editMethod ? "PATCH" : "POST";

      await apiCallJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save method");
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "flat":
        return <DollarSign className="h-5 w-5" />;
      case "weight_based":
        return <Weight className="h-5 w-5" />;
      case "free_shipping":
        return <Gift className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getMethodIcon(formData.type)}
              {editMethod
                ? "Edit Shipping Method"
                : "Create New Shipping Method"}
            </CardTitle>
            <CardDescription>
              {editMethod
                ? "Update shipping method configuration"
                : "Configure pricing and calculation method"}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Method Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. JNE Regular, Flat Rate, etc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carrier *
              </label>
              <select
                value={formData.carrier_id}
                onChange={(e) =>
                  handleInputChange("carrier_id", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={loadingCarriers}
              >
                <option value="">Select Carrier</option>
                {carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name} ({carrier.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Method Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="flat">Flat Rate</option>
                <option value="weight_based">Weight Based</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description for this shipping method"
            />
          </div>

          {/* Method-specific Configuration */}
          {formData.type === "flat" && (
            <Card className="p-4 bg-blue-50">
              <h3 className="font-medium text-blue-800 mb-3">
                Flat Rate Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Cost (IDR) *
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) =>
                      handleInputChange("cost", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="10000"
                    min="0"
                    step="1000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {formatCurrency(formData.cost)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Free Shipping Threshold (IDR)
                  </label>
                  <input
                    type="number"
                    value={formData.min_free_threshold}
                    onChange={(e) =>
                      handleInputChange(
                        "min_free_threshold",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="100000"
                    min="0"
                    step="10000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.min_free_threshold > 0
                      ? `Free shipping for orders above ${formatCurrency(
                          formData.min_free_threshold
                        )}`
                      : "No free shipping threshold"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {formData.type === "weight_based" && (
            <Card className="p-4 bg-purple-50">
              <h3 className="font-medium text-purple-800 mb-3">
                Weight-Based Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Weight Limit (grams)
                  </label>
                  <input
                    type="number"
                    value={formData.weight_limit}
                    onChange={(e) =>
                      handleInputChange(
                        "weight_limit",
                        parseInt(e.target.value) || 1000
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                    min="1"
                    step="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Base cost applies up to {formData.weight_limit}g
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Cost (IDR) *
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) =>
                      handleInputChange("cost", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="10000"
                    min="0"
                    step="1000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(formData.cost)} for items up to{" "}
                    {formData.weight_limit}g
                  </p>
                </div>
              </div>

              {/* Weight Tiers */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Weight Tiers</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addWeightTier}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Tier
                  </Button>
                </div>

                <div className="space-y-3">
                  {weightTiers.map((tier, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Max Weight (g)
                          </label>
                          <input
                            type="number"
                            value={tier.max_weight}
                            onChange={(e) =>
                              updateWeightTier(
                                index,
                                "max_weight",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            min="1"
                            step="100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Base Cost (IDR)
                          </label>
                          <input
                            type="number"
                            value={tier.cost}
                            onChange={(e) =>
                              updateWeightTier(
                                index,
                                "cost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            min="0"
                            step="1000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Extra per KG (IDR)
                          </label>
                          <input
                            type="number"
                            value={tier.extra_cost_per_kg}
                            onChange={(e) =>
                              updateWeightTier(
                                index,
                                "extra_cost_per_kg",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            min="0"
                            step="1000"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeWeightTier(index)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={weightTiers.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Free Shipping Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Free Shipping Threshold (IDR)
                </label>
                <input
                  type="number"
                  value={formData.min_free_threshold}
                  onChange={(e) =>
                    handleInputChange(
                      "min_free_threshold",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="100000"
                  min="0"
                  step="10000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Override weight-based cost if order total exceeds this amount
                </p>
              </div>
            </Card>
          )}

          {formData.type === "free_shipping" && (
            <Card className="p-4 bg-green-50">
              <h3 className="font-medium text-green-800 mb-3">
                Free Shipping Configuration
              </h3>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Free Shipping Rules
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFreeShippingRule}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </Button>
                </div>

                <div className="space-y-3">
                  {freeShippingRules.map((rule, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-white">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Minimum Order Amount (IDR)
                          </label>
                          <input
                            type="number"
                            value={rule.min_order_amount}
                            onChange={(e) =>
                              updateFreeShippingRule(
                                index,
                                "min_order_amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            min="0"
                            step="10000"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.is_active}
                            onChange={(e) =>
                              updateFreeShippingRule(
                                index,
                                "is_active",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="text-sm text-gray-700">
                            Active
                          </label>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFreeShippingRule(index)}
                          className="text-red-600 hover:bg-red-50"
                          disabled={freeShippingRules.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={rule.description}
                          onChange={(e) =>
                            updateFreeShippingRule(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. Free shipping for orders above Rp 100.000"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editMethod ? "Update Method" : "Create Method"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

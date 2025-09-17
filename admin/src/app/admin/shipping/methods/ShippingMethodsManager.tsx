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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Calculator,
  Gift,
  DollarSign,
  Weight,
  Truck,
  Search,
  Filter,
  Settings,
  MapPin,
} from "lucide-react";
import { MethodCreateForm } from "./MethodCreateForm";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  type: "flat" | "weight_based" | "free_shipping";
  status: "active" | "inactive";
  carrier_id: string;
  carrier_name: string;
  cost: number;
  min_free_threshold: number;
  weight_limit: number;
  created_at: string;
  updated_at: string;
}

interface WeightTier {
  id: string;
  method_id: string;
  max_weight: number;
  cost: number;
  extra_cost_per_kg: number;
}

interface FreeShippingRule {
  id: string;
  method_id: string;
  min_order_amount: number;
  description: string;
  is_active: boolean;
}

export function ShippingMethodsManager() {
  const { apiCallJson, apiCall } = useAuthenticatedFetch();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "flat" | "weight_based" | "free_shipping"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Load shipping methods
  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      setLoading(true);
      const data = await apiCallJson("/api/admin/shipping/methods", {
        cache: "no-store",
      });
      setMethods(data.methods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load methods");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm("Are you sure you want to delete this shipping method?"))
      return;

    try {
      const res = await apiCall(`/api/admin/shipping/methods/${methodId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete method");
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete method");
    }
  };

  const handleStatusToggle = async (
    methodId: string,
    currentStatus: string
  ) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await apiCall(`/api/admin/shipping/methods/${methodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Filter methods
  const filteredMethods = methods.filter((method) => {
    const matchesSearch =
      method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.carrier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || method.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || method.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getMethodTypeIcon = (type: string) => {
    switch (type) {
      case "flat":
        return <DollarSign className="h-4 w-4" />;
      case "weight_based":
        return <Weight className="h-4 w-4" />;
      case "free_shipping":
        return <Gift className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMethodTypeBadge = (type: string) => {
    const colors = {
      flat: "bg-blue-100 text-blue-800",
      weight_based: "bg-purple-100 text-purple-800",
      free_shipping: "bg-green-100 text-green-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Shipping Methods...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shipping Methods ({filteredMethods.length})</CardTitle>
              <CardDescription>
                Manage flat rate, weight-based, and free shipping calculation
                methods
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search methods..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as
                    | "all"
                    | "flat"
                    | "weight_based"
                    | "free_shipping"
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="flat">Flat Rate</option>
              <option value="weight_based">Weight Based</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMethods.map((method) => (
              <Card
                key={method.id}
                className="relative group hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getMethodTypeIcon(method.type)}
                      <CardTitle className="text-lg">{method.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        className={`${
                          method.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {method.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {method.description || "No description"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getMethodTypeBadge(
                        method.type
                      )}`}
                    >
                      {method.type.replace("_", " ").toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Truck className="h-3 w-3" />
                      <span>{method.carrier_name}</span>
                    </div>
                  </div>

                  {/* Method-specific info */}
                  {method.type === "flat" && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Fixed Rate:</span>
                        <span className="font-bold text-blue-800">
                          {formatCurrency(method.cost)}
                        </span>
                      </div>
                      {method.min_free_threshold > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          Free shipping min:{" "}
                          {formatCurrency(method.min_free_threshold)}
                        </div>
                      )}
                    </div>
                  )}

                  {method.type === "weight_based" && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Base Rate:</span>
                        <span className="font-bold text-purple-800">
                          {formatCurrency(method.cost)}
                        </span>
                      </div>
                      {method.weight_limit > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          Up to {method.weight_limit}g
                        </div>
                      )}
                      {method.min_free_threshold > 0 && (
                        <div className="text-xs text-purple-600">
                          Free shipping min:{" "}
                          {formatCurrency(method.min_free_threshold)}
                        </div>
                      )}
                    </div>
                  )}

                  {method.type === "free_shipping" && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center justify-center">
                        <span className="font-bold text-green-800">
                          FREE SHIPPING
                        </span>
                      </div>
                      {method.min_free_threshold > 0 && (
                        <div className="text-xs text-green-600 text-center mt-1">
                          Min order: {formatCurrency(method.min_free_threshold)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>0 zones</span>
                    </div>
                    <span className="text-xs">
                      Updated {new Date(method.updated_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMethod(method)}
                      className="flex-1"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleStatusToggle(method.id, method.status)
                      }
                      className={
                        method.status === "active"
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {method.status === "active" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(method.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMethods.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No shipping methods found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first shipping method."}
              </p>
              {!searchTerm &&
                typeFilter === "all" &&
                statusFilter === "all" && (
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Method
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Method Configuration Modal - placeholder for now */}
      {selectedMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Method: {selectedMethod.name}</CardTitle>
            <Button
              variant="outline"
              onClick={() => setSelectedMethod(null)}
              className="w-fit"
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <p>Method configuration panel will be implemented here...</p>
            <p>
              This will include weight tiers, free shipping rules, zone
              assignments, etc.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <MethodCreateForm
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => {
                loadMethods();
                setShowCreateForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Edit,
  Trash2,
  DollarSign,
  Scale,
  Clock,
  MapPin,
  Network,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ShippingMethod {
  id: string;
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
  created_at: string;
  updated_at: string;

  zone_name: string;
  zone_code: string;
  zone_status: string;
  gateway_name: string;
  gateway_code: string;
  gateway_type: string;
  gateway_status: string;
}

export default function ShippingMethodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [method, setMethod] = useState<ShippingMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMethod();
  }, [resolvedParams.id]);

  const fetchMethod = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/shipping/methods/${resolvedParams.id}`
      );

      if (!response.ok) {
        throw new Error("Method not found");
      }

      const data = await response.json();
      setMethod(data.method);
    } catch (error) {
      console.error("Error fetching method:", error);
      alert("Failed to load method details");
      router.push("/admin/shipping/methods");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/shipping/methods/${resolvedParams.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete method");
      }

      router.push("/admin/shipping/methods");
    } catch (error) {
      console.error("Error deleting method:", error);
      alert(error instanceof Error ? error.message : "Failed to delete method");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getMethodTypeColor = (type: string) => {
    switch (type) {
      case "flat":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "weight_based":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "free_shipping":
        return "bg-green-100 text-green-800 border-green-200";
      case "percentage":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
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

  if (!method) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">
          Method not found
        </h2>
        <p className="text-gray-500 mt-2">
          The requested shipping method could not be found.
        </p>
        <Link href="/admin/shipping/methods">
          <Button className="mt-4">Back to Methods</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/shipping/methods">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Methods
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">{method.name}</h1>
              <p className="text-gray-600">
                {method.zone_name} • {method.gateway_name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getStatusColor(method.status)}>
            {method.status === "active" ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {method.status.toUpperCase()}
          </Badge>

          <Link href={`/admin/shipping/methods/${method.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shipping Method</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{method.name}&quot;?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete Method"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Zone
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <Badge variant="outline">{method.zone_code}</Badge>
                  <span className="text-sm">{method.zone_name}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Gateway
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Network className="h-4 w-4 text-gray-400" />
                  <Badge
                    variant={
                      method.gateway_type === "api" ? "default" : "secondary"
                    }
                  >
                    {method.gateway_code}
                  </Badge>
                  <span className="text-sm">{method.gateway_name}</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">
                Method Type
              </Label>
              <div className="mt-1">
                <Badge
                  variant="secondary"
                  className={getMethodTypeColor(method.method_type)}
                >
                  {method.method_type.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>

            {method.description && (
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {method.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Sort Order
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {method.sort_order}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Created
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(method.created_at).toLocaleDateString()}
                </p>
              </div>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Base Cost
                </Label>
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-lg font-semibold">
                    {method.currency}{" "}
                    {parseFloat(String(method.base_cost || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Currency
                </Label>
                <p className="text-sm text-gray-700 mt-1">{method.currency}</p>
              </div>
            </div>

            {method.method_type === "weight_based" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Weight Threshold
                    </Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {method.weight_threshold} {method.weight_unit}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">
                      Cost per KG
                    </Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {method.currency}{" "}
                      {parseFloat(String(method.cost_per_kg || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {(method.method_type === "free_shipping" ||
              method.min_free_threshold > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Free Shipping Threshold
                  </Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {method.currency}{" "}
                    {parseFloat(String(method.min_free_threshold || 0)).toFixed(
                      2
                    )}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Max Free Weight
                  </Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {method.max_free_weight} {method.weight_unit}
                  </p>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Weight Unit
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {method.weight_unit}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Max Weight Limit
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {method.max_weight_limit} {method.weight_unit}
                </p>
              </div>
            </div>

            {method.max_dimensions && (
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Maximum Dimensions
                </Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {method.max_dimensions.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">L</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {method.max_dimensions.width || 0}
                    </div>
                    <div className="text-xs text-gray-500">W</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {method.max_dimensions.height || 0}
                    </div>
                    <div className="text-xs text-gray-500">H</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {method.max_dimensions.unit || "cm"}
                    </div>
                    <div className="text-xs text-gray-500">Unit</div>
                  </div>
                </div>
              </div>
            )}

            {method.restricted_items && method.restricted_items.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Restricted Items
                </Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {method.restricted_items.map((item, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Estimated Delivery
              </Label>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-lg font-semibold">
                  {method.estimated_days_min === method.estimated_days_max
                    ? `${method.estimated_days_min} days`
                    : `${method.estimated_days_min}-${method.estimated_days_max} days`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Minimum Days
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {method.estimated_days_min}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Maximum Days
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {method.estimated_days_max}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">
                Last Updated
              </Label>
              <p className="text-sm text-gray-700 mt-1">
                {new Date(method.updated_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return (
    <label
      className={`block text-sm font-medium ${className || ""}`}
      {...props}
    >
      {children}
    </label>
  );
}

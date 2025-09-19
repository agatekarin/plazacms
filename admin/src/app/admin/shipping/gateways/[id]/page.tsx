"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Network,
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Package,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  Globe,
  Code,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface GatewayDetails {
  gateway: {
    id: number;
    code: string;
    name: string;
    type: "manual" | "api" | "hybrid";
    status: "active" | "inactive";
    logo_url?: string;
    tracking_url_template?: string;
    api_config: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    zones_count: number;
    methods_count: number;
  };
  zones: Array<{
    zone_id: number;
    gateway_id: number;
    is_available: boolean;
    priority: number;
    zone_code: string;
    zone_name: string;
    zone_status: string;
  }>;
  methods: Array<{
    id: number;
    name: string;
    method_type: string;
    base_cost: number;
    currency: string;
    status: string;
    zone_code: string;
    zone_name: string;
    estimated_days_min: number;
    estimated_days_max: number;
  }>;
}

export default function GatewayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [details, setDetails] = useState<GatewayDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { apiCallJson, apiCall } = useAuthenticatedFetch();

  useEffect(() => {
    fetchGatewayDetails();
  }, [resolvedParams.id]);

  const fetchGatewayDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCallJson(
        `/api/admin/shipping/gateways/${resolvedParams.id}`,
        { cache: "no-store" }
      );
      setDetails(data);
    } catch (error) {
      console.error("Error fetching gateway details:", error);
      setError("Failed to load gateway details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGateway = async () => {
    try {
      const res = await apiCall(
        `/api/admin/shipping/gateways/${resolvedParams.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({} as any));
        alert((error as any)?.error || "Failed to delete gateway");
        return;
      }

      router.push("/admin/shipping/gateways");
    } catch (error) {
      console.error("Error deleting gateway:", error);
      alert("Failed to delete gateway");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "api":
        return "bg-blue-100 text-blue-800";
      case "manual":
        return "bg-green-100 text-green-800";
      case "hybrid":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getMethodTypeColor = (type: string) => {
    switch (type) {
      case "flat":
        return "bg-blue-100 text-blue-800";
      case "weight_based":
        return "bg-orange-100 text-orange-800";
      case "free_shipping":
        return "bg-green-100 text-green-800";
      case "percentage":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gateway details...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Gateway not found"}
          </h2>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { gateway, zones, methods } = details;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {gateway.logo_url ? (
                <img
                  src={gateway.logo_url}
                  alt={gateway.name}
                  className="h-8 w-8 rounded object-contain"
                />
              ) : (
                <Network className="h-6 w-6" />
              )}
              {gateway.name}
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              <Code className="h-4 w-4" />
              {gateway.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/admin/shipping/gateways/${gateway.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="danger">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Gateway</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{gateway.name}&quot;?
                  This action cannot be undone and will affect any associated
                  shipping methods.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGateway}>
                  Delete Gateway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Gateway Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gateway Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Type
                </label>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={getTypeColor(gateway.type)}
                  >
                    {gateway.type.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={getStatusColor(gateway.status)}
                  >
                    {gateway.status === "active" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {gateway.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {gateway.tracking_url_template && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tracking URL Template
                </label>
                <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                  {gateway.tracking_url_template}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Created
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(gateway.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Last Updated
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(gateway.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Available Zones</span>
              </div>
              <span className="font-semibold">{gateway.zones_count}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Shipping Methods</span>
              </div>
              <span className="font-semibold">{gateway.methods_count}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zone Availability ({zones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {zones.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No zones configured for this gateway
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.zone_id}>
                    <TableCell className="font-medium">
                      {zone.zone_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{zone.zone_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(zone.zone_status)}
                      >
                        {zone.zone_status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {zone.is_available ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {zone.priority}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Shipping Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipping Methods ({methods.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {methods.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                No shipping methods configured for this gateway
              </p>
              <Link
                href={`/admin/shipping/methods/create?gateway_id=${gateway.id}`}
              >
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Method
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Delivery Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>
                      <Link
                        href={`/admin/shipping/methods/${method.id}`}
                        className="font-medium hover:text-blue-600"
                      >
                        {method.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{method.zone_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getMethodTypeColor(method.method_type)}
                      >
                        {method.method_type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {method.currency}{" "}
                      {parseFloat(String(method.base_cost || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {method.estimated_days_min === method.estimated_days_max
                        ? `${method.estimated_days_min} days`
                        : `${method.estimated_days_min}-${method.estimated_days_max} days`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(method.status)}
                      >
                        {method.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

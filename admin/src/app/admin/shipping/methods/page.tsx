"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Network,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

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
  zone_priority: number;
  gateway_name: string;
  gateway_code: string;
  gateway_type: string;
}

export default function ShippingMethodsPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [methodTypeFilter, setMethodTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { apiCallJson, apiCall } = useAuthenticatedFetch();

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        zone_id: zoneFilter,
        gateway_id: gatewayFilter,
        method_type: methodTypeFilter,
        status: statusFilter,
        limit: "100",
      });
      const data = await apiCallJson(`/api/admin/shipping/methods?${params}`, {
        cache: "no-store",
      });
      setMethods(data.methods);
    } catch (error) {
      console.error("Error fetching methods:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [searchQuery, zoneFilter, gatewayFilter, methodTypeFilter, statusFilter]);

  const handleDeleteMethod = async (id: string) => {
    if (!confirm("Are you sure you want to delete this method?")) return;

    try {
      const res = await apiCall(`/api/admin/shipping/methods/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({} as any));
        alert((error as any)?.error || "Failed to delete method");
        return;
      }
      fetchMethods();
    } catch (error) {
      console.error("Error deleting method:", error);
      alert("Failed to delete method");
    }
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

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6" />
            Shipping Methods
          </h1>
          <p className="text-gray-600 mt-1">
            Pricing rules and calculation methods per zone-gateway combination
          </p>
        </div>
        <Link href="/admin/shipping/methods/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Method
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search methods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={methodTypeFilter}
              onValueChange={setMethodTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Method type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="flat">Flat Rate</SelectItem>
                <SelectItem value="weight_based">Weight Based</SelectItem>
                <SelectItem value="free_shipping">Free Shipping</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Zone filter..." />
            <Input placeholder="Gateway filter..." />
          </div>
        </CardContent>
      </Card>

      {/* Methods Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Methods ({methods.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading methods...</p>
            </div>
          ) : methods.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No shipping methods found</p>
              <Link href="/admin/shipping/methods/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Method
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {method.method_type === "weight_based" && (
                            <span>
                              Weight: ≤{method.weight_threshold}
                              {method.weight_unit} → base, &gt;
                              {method.weight_threshold}
                              {method.weight_unit} → +{method.currency}{" "}
                              {parseFloat(
                                String(method.cost_per_kg || 0)
                              ).toFixed(0)}
                              /kg
                            </span>
                          )}
                          {method.method_type === "free_shipping" &&
                            method.min_free_threshold > 0 && (
                              <span>
                                Free above {method.currency}{" "}
                                {parseFloat(
                                  String(method.min_free_threshold || 0)
                                ).toFixed(0)}
                              </span>
                            )}
                          {method.method_type === "flat" && (
                            <span>Fixed rate shipping</span>
                          )}
                          {method.method_type === "percentage" && (
                            <span>Percentage-based pricing</span>
                          )}
                        </div>
                        {method.description && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            {method.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <Badge variant="outline">{method.zone_code}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Network className="h-4 w-4 text-gray-500" />
                        <Badge variant="outline">{method.gateway_code}</Badge>
                      </div>
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
                      <div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {method.currency}{" "}
                            {parseFloat(String(method.base_cost || 0)).toFixed(
                              2
                            )}
                          </span>
                        </div>
                        {method.max_weight_limit > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            Max: {method.max_weight_limit}
                            {method.weight_unit}
                          </div>
                        )}
                        {method.restricted_items &&
                          method.restricted_items.length > 0 && (
                            <div className="text-xs text-red-500 mt-1">
                              {method.restricted_items.length} restrictions
                            </div>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {method.estimated_days_min === method.estimated_days_max
                        ? `${method.estimated_days_min}d`
                        : `${method.estimated_days_min}-${method.estimated_days_max}d`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(method.status)}
                      >
                        {method.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-2">
                            <MoreHorizontal className="h-4 w-4 mr-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/shipping/methods/${method.id}`}
                              className="flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/shipping/methods/${method.id}/edit`}
                              className="flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Method
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteMethod(method.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Network,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
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

interface ShippingGateway {
  id: number;
  code: string;
  name: string;
  type: "manual" | "api" | "hybrid";
  status: "active" | "inactive";
  logo_url?: string;
  tracking_url_template?: string;
  created_at: string;
  updated_at: string;
  zones_count: number;
  methods_count: number;
  zones: Array<{
    zone_id: number;
    zone_code: string;
    zone_name: string;
    is_available: boolean;
    priority: number;
  }>;
}

export default function ShippingGatewaysPage() {
  const [gateways, setGateways] = useState<ShippingGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { apiCallJson, apiCall } = useAuthenticatedFetch();

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchQuery,
        type: typeFilter,
        status: statusFilter,
      });
      const data = await apiCallJson(`/api/admin/shipping/gateways?${params}`, {
        cache: "no-store",
      });
      setGateways(data.gateways);
    } catch (error) {
      console.error("Error fetching gateways:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, [currentPage, searchQuery, typeFilter, statusFilter]);

  const handleDeleteGateway = async (id: number) => {
    if (!confirm("Are you sure you want to delete this gateway?")) return;

    try {
      const res = await apiCall(`/api/admin/shipping/gateways/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({} as any));
        alert((error as any)?.error || "Failed to delete gateway");
        return;
      }

      fetchGateways();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="h-6 w-6" />
            Shipping Gateways
          </h1>
          <p className="text-gray-600 mt-1">
            Manage carriers and service providers with zone availability
          </p>
        </div>
        <Link href="/admin/shipping/gateways/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Gateway
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search gateways..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gateways Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Gateways ({gateways.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading gateways...</p>
            </div>
          ) : gateways.length === 0 ? (
            <div className="p-8 text-center">
              <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No shipping gateways found</p>
              <Link href="/admin/shipping/gateways/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Gateway
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zones</TableHead>
                  <TableHead>Methods</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gateway) => (
                  <TableRow key={gateway.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {gateway.logo_url ? (
                          <img
                            src={gateway.logo_url}
                            alt={gateway.name}
                            className="h-8 w-8 rounded object-contain"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                            <Network className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{gateway.name}</div>
                          <div className="text-sm text-gray-500">
                            {gateway.code}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getTypeColor(gateway.type)}
                      >
                        {gateway.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {gateway.zones_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {gateway.methods_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(gateway.created_at).toLocaleDateString()}
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
                              href={`/admin/shipping/gateways/${gateway.id}`}
                              className="flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/shipping/gateways/${gateway.id}/edit`}
                              className="flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Gateway
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteGateway(gateway.id)}
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

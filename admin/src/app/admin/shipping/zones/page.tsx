"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Globe,
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

interface ShippingZone {
  id: number;
  code: string;
  name: string;
  description: string;
  priority: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  countries_count: number;
  gateways_count: number;
  methods_count: number;
  countries: Array<{
    country_code: string;
    country_name: string;
  }>;
}

export default function ShippingZonesPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { apiCallJson, apiCall } = useAuthenticatedFetch();

  const fetchZones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchQuery,
        status: statusFilter,
      });
      const data = await apiCallJson(`/api/admin/shipping/zones?${params}`, {
        cache: "no-store",
      });
      setZones(data.zones);
    } catch (error) {
      console.error("Error fetching zones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [currentPage, searchQuery, statusFilter]);

  const handleDeleteZone = async (id: number) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;

    try {
      const res = await apiCall(`/api/admin/shipping/zones/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({} as any));
        alert((error as any)?.error || "Failed to delete zone");
        return;
      }

      fetchZones();
    } catch (error) {
      console.error("Error deleting zone:", error);
      alert("Failed to delete zone");
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return "bg-red-100 text-red-800";
    if (priority <= 6) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Shipping Zones
          </h1>
          <p className="text-gray-600 mt-1">
            Manage geographic coverage areas and country assignments
          </p>
        </div>
        <Link href="/admin/shipping/zones/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Zone
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
                  placeholder="Search zones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
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

      {/* Zones Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zones ({zones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading zones...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No shipping zones found</p>
              <Link href="/admin/shipping/zones/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Zone
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead>Gateways</TableHead>
                  <TableHead>Methods</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{zone.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {zone.code}
                          </Badge>
                        </div>
                        {zone.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {zone.description.length > 50
                              ? `${zone.description.slice(0, 50)}...`
                              : zone.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getPriorityColor(zone.priority)}
                      >
                        {zone.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(zone.status)}
                      >
                        {zone.status === "active" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {zone.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {zone.countries_count}
                        </span>
                        {zone.countries.length > 0 && (
                          <div className="ml-2 flex flex-wrap gap-1">
                            {zone.countries.slice(0, 3).map((country) => (
                              <Badge
                                key={country.country_code}
                                variant="outline"
                                className="text-xs"
                              >
                                {country.country_code}
                              </Badge>
                            ))}
                            {zone.countries.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{zone.countries.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {zone.gateways_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {zone.methods_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(zone.created_at).toLocaleDateString()}
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
                              href={`/admin/shipping/zones/${zone.id}`}
                              className="flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/shipping/zones/${zone.id}/edit`}
                              className="flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Zone
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteZone(zone.id)}
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

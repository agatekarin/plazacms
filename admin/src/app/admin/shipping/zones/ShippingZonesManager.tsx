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
  MapPin,
  Globe,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Settings,
  Users,
} from "lucide-react";
import { ZoneCreateForm } from "./ZoneCreateForm";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface ShippingZone {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  zone_type: "location" | "radius" | "postal" | "custom";
  priority: number;
  created_at: string;
  updated_at: string;
  locations_count: number;
  methods_count: number;
}

interface ShippingZoneLocation {
  id: string;
  zone_id: string;
  country_name: string;
  state_name: string;
  city_name: string;
  postal_codes: string[];
}

export function ShippingZonesManager() {
  const { apiCallJson, apiCall } = useAuthenticatedFetch();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Load shipping zones
  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const data = await apiCallJson("/api/admin/shipping/zones", {
        cache: "no-store",
      });
      setZones(data.zones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this shipping zone?")) return;

    try {
      const res = await apiCall(`/api/admin/shipping/zones/${zoneId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete zone");
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete zone");
    }
  };

  const handleStatusToggle = async (zoneId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await apiCall(`/api/admin/shipping/zones/${zoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Filter zones
  const filteredZones = zones.filter((zone) => {
    const matchesSearch =
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || zone.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getZoneTypeIcon = (type: string) => {
    switch (type) {
      case "location":
        return <MapPin className="h-4 w-4" />;
      case "radius":
        return <Globe className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getZoneTypeBadge = (type: string) => {
    const colors = {
      location: "bg-blue-100 text-blue-800",
      radius: "bg-green-100 text-green-800",
      postal: "bg-purple-100 text-purple-800",
      custom: "bg-gray-100 text-gray-800",
    };
    return colors[type as keyof typeof colors] || colors.custom;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Shipping Zones...</CardTitle>
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
              <CardTitle>Shipping Zones ({filteredZones.length})</CardTitle>
              <CardDescription>
                Manage shipping coverage areas and zone configurations
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Zone
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
                placeholder="Search zones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((zone) => (
              <Card
                key={zone.id}
                className="relative group hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getZoneTypeIcon(zone.zone_type)}
                      <CardTitle className="text-lg">{zone.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        className={`${
                          zone.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {zone.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {zone.description || "No description"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getZoneTypeBadge(
                        zone.zone_type
                      )}`}
                    >
                      {zone.zone_type.toUpperCase()}
                    </span>
                    <span className="text-gray-500">
                      Priority: {zone.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{zone.locations_count} locations</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      <span>{zone.methods_count} methods</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedZone(zone)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
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
                      onClick={() => handleStatusToggle(zone.id, zone.status)}
                      className={
                        zone.status === "active"
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {zone.status === "active" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(zone.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredZones.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No shipping zones found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first shipping zone."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Zone
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone Details Modal/Sidebar - placeholder for now */}
      {selectedZone && (
        <Card>
          <CardHeader>
            <CardTitle>Zone Details: {selectedZone.name}</CardTitle>
            <Button
              variant="outline"
              onClick={() => setSelectedZone(null)}
              className="w-fit"
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <p>Zone details will be implemented here...</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <ZoneCreateForm
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => {
                loadZones();
                setShowCreateForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

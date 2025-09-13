"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Network,
  ArrowLeft,
  Save,
  MapPin,
  Settings,
  Globe,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Zone {
  id: number;
  code: string;
  name: string;
  status: string;
  countries_count: number;
}

interface ZoneAssignment {
  zone_id: number;
  is_available: boolean;
  priority: number;
}

interface GatewayForm {
  code: string;
  name: string;
  type: "manual" | "api" | "hybrid";
  logo_url: string;
  tracking_url_template: string;
  api_config: Record<string, unknown>;
  status: "active" | "inactive";
  zones: ZoneAssignment[];
}

export default function CreateGatewayPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);

  const [formData, setFormData] = useState<GatewayForm>({
    code: "",
    name: "",
    type: "manual",
    logo_url: "",
    tracking_url_template: "",
    api_config: {},
    status: "active",
    zones: [],
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoadingZones(true);
      const response = await fetch("/api/admin/shipping/zones?limit=100");
      if (!response.ok) throw new Error("Failed to fetch zones");

      const data = await response.json();
      setZones(data.zones);
    } catch (error) {
      console.error("Error fetching zones:", error);
    } finally {
      setLoadingZones(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/shipping/gateways", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create gateway");
      }

      const result = await response.json();
      router.push(`/admin/shipping/gateways/${result.gateway.id}`);
    } catch (error) {
      console.error("Error creating gateway:", error);
      alert(
        error instanceof Error ? error.message : "Failed to create gateway"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateZoneAssignment = (
    zoneId: number,
    field: keyof ZoneAssignment,
    value: boolean | number
  ) => {
    setFormData((prev) => {
      const existingIndex = prev.zones.findIndex((z) => z.zone_id === zoneId);

      if (existingIndex >= 0) {
        // Update existing assignment
        const updatedZones = [...prev.zones];
        updatedZones[existingIndex] = {
          ...updatedZones[existingIndex],
          [field]: value,
        };
        return { ...prev, zones: updatedZones };
      } else {
        // Create new assignment
        const newAssignment: ZoneAssignment = {
          zone_id: zoneId,
          is_available: field === "is_available" ? (value as boolean) : true,
          priority: field === "priority" ? (value as number) : 1,
        };
        return { ...prev, zones: [...prev.zones, newAssignment] };
      }
    });
  };

  const getZoneAssignment = (zoneId: number): ZoneAssignment => {
    return (
      formData.zones.find((z) => z.zone_id === zoneId) || {
        zone_id: zoneId,
        is_available: false,
        priority: 1,
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
            <Network className="h-6 w-6" />
            Create Shipping Gateway
          </h1>
          <p className="text-gray-600 mt-1">
            Add a new carrier or service provider
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Gateway Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="UPS, FEDEX, DHL, etc."
                  required
                  maxLength={30}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier (uppercase, max 30 chars)
                </p>
              </div>
              <div>
                <Label htmlFor="name">Gateway Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="UPS Ground, FedEx Express, etc."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Gateway Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "manual" | "api" | "hybrid") =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      Manual - Fixed pricing only
                    </SelectItem>
                    <SelectItem value="api">
                      API - Real-time rates via API
                    </SelectItem>
                    <SelectItem value="hybrid">
                      Hybrid - Both manual and API
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setFormData((prev) => ({ ...prev, status: value }))
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
              <Label htmlFor="logo_url">Logo URL (Optional)</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logo_url: e.target.value }))
                }
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div>
              <Label htmlFor="tracking_url_template">
                Tracking URL Template (Optional)
              </Label>
              <Input
                id="tracking_url_template"
                value={formData.tracking_url_template}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tracking_url_template: e.target.value,
                  }))
                }
                placeholder="https://example.com/track/{tracking_number}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {"{tracking_number}"} as placeholder
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Zone Availability Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Zone Availability Matrix
            </CardTitle>
            <p className="text-sm text-gray-600">
              Configure which zones this gateway can serve and their priority
            </p>
          </CardHeader>
          <CardContent>
            {loadingZones ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading zones...</p>
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No shipping zones found</p>
                <p className="text-sm text-gray-500">
                  Create zones first to assign them to this gateway
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {zones.map((zone) => {
                  const assignment = getZoneAssignment(zone.id);
                  return (
                    <div
                      key={zone.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={assignment.is_available}
                          onCheckedChange={(checked: boolean) =>
                            updateZoneAssignment(
                              zone.id,
                              "is_available",
                              checked
                            )
                          }
                        />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {zone.name}
                            <Badge variant="outline">{zone.code}</Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {zone.countries_count} countries
                          </div>
                        </div>
                      </div>

                      {assignment.is_available && (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`priority-${zone.id}`}
                            className="text-sm"
                          >
                            Priority:
                          </Label>
                          <Input
                            id={`priority-${zone.id}`}
                            type="number"
                            min="1"
                            max="100"
                            value={assignment.priority}
                            onChange={(e) =>
                              updateZoneAssignment(
                                zone.id,
                                "priority",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Gateway
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

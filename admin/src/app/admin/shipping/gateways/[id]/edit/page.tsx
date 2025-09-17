"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Network,
  ArrowLeft,
  Save,
  Settings,
  MapPin,
  Trash2,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Zone {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface GatewayForm {
  code: string;
  name: string;
  type: "manual" | "api" | "hybrid";
  status: "active" | "inactive";
  logo_url: string;
  tracking_url_template: string;
  api_config: Record<string, any>;
}

export default function EditGatewayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [zoneSearch, setZoneSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { apiCallJson } = useAuthenticatedFetch();
  const [formData, setFormData] = useState<GatewayForm>({
    code: "",
    name: "",
    type: "manual",
    status: "active",
    logo_url: "",
    tracking_url_template: "",
    api_config: {},
  });

  useEffect(() => {
    fetchData();
  }, [resolvedParams.id]);

  const fetchData = async () => {
    try {
      setLoadingData(true);

      // Fetch gateway data and zones in parallel
      const [gatewayData, zonesData] = await Promise.all([
        apiCallJson(`/api/admin/shipping/gateways/${resolvedParams.id}`, {
          cache: "no-store",
        }),
        apiCallJson("/api/admin/shipping/zones?limit=100", {
          cache: "no-store",
        }),
      ]);

      const gateway = gatewayData.gateway;
      setFormData({
        code: gateway.code,
        name: gateway.name,
        type: gateway.type,
        status: gateway.status,
        logo_url: gateway.logo_url || "",
        tracking_url_template: gateway.tracking_url_template || "",
        api_config: gateway.api_config || {},
      });

      // Set selected zones from API response (top-level `zones` contains zone_id)
      if (Array.isArray(gatewayData.zones)) {
        setSelectedZones(new Set(gatewayData.zones.map((z: any) => z.zone_id)));
      }

      setZones(zonesData.zones || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load gateway data");
      router.push("/admin/shipping/gateways");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      const zonesData = Array.from(selectedZones).map((zoneId) => {
        const zone = zones.find((z) => z.id === zoneId);
        return {
          zone_id: zoneId,
          gateway_id: resolvedParams.id,
          is_available: true,
          priority: 1,
        };
      });

      const submitData = {
        ...formData,
        zones: zonesData,
      };

      const data = await apiCallJson(
        `/api/admin/shipping/gateways/${resolvedParams.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        }
      );

      // Redirect to gateway detail page
      router.push(`/admin/shipping/gateways/${resolvedParams.id}`);
    } catch (error) {
      console.error("Error updating gateway:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update gateway"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleZoneSelect = (zoneId: string) => {
    const newSelected = new Set(selectedZones);
    if (newSelected.has(zoneId)) {
      newSelected.delete(zoneId);
    } else {
      newSelected.add(zoneId);
    }
    setSelectedZones(newSelected);
  };

  const getSelectedZoneNames = () => {
    return Array.from(selectedZones).map((id) => {
      const zone = zones.find((z) => z.id === id);
      return { id, code: zone?.code || id, name: zone?.name || id };
    });
  };

  const filteredZones = zones.filter(
    (zone) =>
      zone.name.toLowerCase().includes(zoneSearch.toLowerCase()) ||
      zone.code.toLowerCase().includes(zoneSearch.toLowerCase())
  );

  const handleApiConfigChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      api_config: {
        ...prev.api_config,
        [key]: value,
      },
    }));
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
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
        <Link href={`/admin/shipping/gateways/${resolvedParams.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gateway
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Network className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Edit Shipping Gateway</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Gateway Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., JNE, FEDEX, DHL"
                    required
                    maxLength={30}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        type: value as "manual" | "api",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="api">API Integration</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Gateway Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., JNE Express, FedEx International"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        status: value as "active" | "inactive",
                      })
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
                <div>
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) =>
                      setFormData({ ...formData, logo_url: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tracking_url_template">
                  Tracking URL Template
                </Label>
                <Input
                  id="tracking_url_template"
                  value={formData.tracking_url_template}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tracking_url_template: e.target.value,
                    })
                  }
                  placeholder="https://track.carrier.com/{tracking_number}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {"{tracking_number}"} as placeholder for tracking number
                </p>
              </div>

              {formData.type === "api" && (
                <div>
                  <Label>Additional API Config</Label>
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder="timeout"
                      value={formData.api_config.timeout || ""}
                      onChange={(e) =>
                        handleApiConfigChange("timeout", e.target.value)
                      }
                    />
                    <Input
                      placeholder="user_agent"
                      value={formData.api_config.user_agent || ""}
                      onChange={(e) =>
                        handleApiConfigChange("user_agent", e.target.value)
                      }
                    />
                    <Input
                      placeholder="sandbox_mode (true/false)"
                      value={formData.api_config.sandbox_mode || ""}
                      onChange={(e) =>
                        handleApiConfigChange("sandbox_mode", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zone Assignment */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zone Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Available Zones</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedZones.size > 0
                        ? `${selectedZones.size} zones selected`
                        : "Select shipping zones..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search zones..."
                        value={zoneSearch}
                        onValueChange={setZoneSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No zones found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {filteredZones.map((zone) => (
                            <CommandItem
                              key={zone.id}
                              value={`${zone.name}-${zone.code}`}
                              onSelect={() => {
                                handleZoneSelect(zone.id);
                              }}
                              onClick={() => {
                                handleZoneSelect(zone.id);
                              }}
                              className="cursor-pointer hover:bg-gray-50 aria-selected:bg-gray-100"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex items-center gap-2">
                                  {selectedZones.has(zone.id) ? (
                                    <div className="h-4 w-4 bg-gray-900 rounded-sm flex items-center justify-center">
                                      <div className="h-2 w-2 bg-white" />
                                    </div>
                                  ) : (
                                    <div className="h-4 w-4 border border-gray-300 rounded-sm" />
                                  )}
                                  <span>{zone.name}</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs ml-auto"
                                >
                                  {zone.code}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Selected Zones Display */}
              {selectedZones.size > 0 && (
                <div>
                  <Label>Selected Zones ({selectedZones.size})</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getSelectedZoneNames().map(({ id, code, name }) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        {name} ({code})
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                          onClick={() => handleZoneSelect(id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/admin/shipping/gateways/${resolvedParams.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Updating..." : "Update Gateway"}
          </Button>
        </div>
      </form>
    </div>
  );
}

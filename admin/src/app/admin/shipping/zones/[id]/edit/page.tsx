"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  ArrowLeft,
  Save,
  Globe,
  Search,
  Plus,
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
import { Switch } from "@/components/ui/switch";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
}

interface ZoneForm {
  code: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  priority: number;
}

export default function EditZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(
    new Set()
  );
  const [countrySearch, setCountrySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { apiCallJson } = useAuthenticatedFetch();
  const [formData, setFormData] = useState<ZoneForm>({
    code: "",
    name: "",
    description: "",
    status: "active",
    priority: 0,
  });

  useEffect(() => {
    fetchData();
  }, [resolvedParams.id]);

  const fetchData = async () => {
    try {
      setLoadingData(true);

      // Fetch zone data and countries in parallel
      const [zoneData, countriesData] = await Promise.all([
        apiCallJson(`/api/admin/shipping/zones/${resolvedParams.id}`, {
          cache: "no-store",
        }),
        apiCallJson("/api/admin/locations/countries?limit=1000", {
          cache: "no-store",
        }),
      ]);

      const zone = zoneData.zone;
      setFormData({
        code: zone.code,
        name: zone.name,
        description: zone.description || "",
        status: zone.status,
        priority: zone.priority || 0,
      });

      // Set selected countries from API response countries[] (country_code CHAR(2) may contain padding)
      const apiCountries: Array<{
        country_code: string;
        country_name: string;
      }> = Array.isArray(zoneData.countries) ? zoneData.countries : [];
      if (apiCountries.length > 0) {
        const normalized = apiCountries.map((c) =>
          (c.country_code || "").trim().toUpperCase()
        );
        setSelectedCountries(new Set(normalized));
      }

      setCountries(countriesData.countries || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load zone data");
      router.push("/admin/shipping/zones");
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

      const countriesData = Array.from(selectedCountries).map((countryCode) => {
        const country = countries.find((c) => c.iso2 === countryCode);
        return {
          zone_id: resolvedParams.id,
          country_code: countryCode,
          country_name: country?.name || countryCode,
        };
      });

      const submitData = {
        ...formData,
        countries: countriesData,
      };

      await apiCallJson(`/api/admin/shipping/zones/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      // Redirect to zones list
      router.push("/admin/shipping/zones");
    } catch (error) {
      console.error("Error updating zone:", error);
      alert(error instanceof Error ? error.message : "Failed to update zone");
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    const newSelected = new Set(selectedCountries);
    const code = (countryCode || "").trim().toUpperCase();
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedCountries(newSelected);
  };

  const getSelectedCountryNames = () => {
    return Array.from(selectedCountries).map((raw) => {
      const code = (raw || "").trim().toUpperCase();
      const country = countries.find(
        (c) => (c.iso2 || "").trim().toUpperCase() === code
      );
      return { code, name: country?.name || code };
    });
  };

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.iso2.toLowerCase().includes(countrySearch.toLowerCase())
  );

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
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
        <Link href="/admin/shipping/zones">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Zones
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Edit Shipping Zone</h1>
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
                  <Label htmlFor="code">Zone Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., ID, US, EU"
                    required
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Zone Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Indonesia, United States, Europe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description of the shipping zone"
                  rows={3}
                />
              </div>

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
            </CardContent>
          </Card>

          {/* Country Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Country Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Countries</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {selectedCountries.size > 0
                        ? `${selectedCountries.size} countries selected`
                        : "Search and select countries..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search countries..."
                        value={countrySearch}
                        onValueChange={setCountrySearch}
                      />
                      <CommandList>
                        <CommandEmpty>No countries found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {filteredCountries.map((country) => (
                            <CommandItem
                              key={country.iso2}
                              value={`${country.name}-${(country.iso2 || "")
                                .trim()
                                .toUpperCase()}`}
                              onSelect={() => {
                                handleCountrySelect(country.iso2);
                              }}
                              onClick={() => {
                                handleCountrySelect(country.iso2);
                              }}
                              className="cursor-pointer hover:bg-gray-50 aria-selected:bg-gray-100"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex items-center gap-2">
                                  {selectedCountries.has(
                                    (country.iso2 || "").trim().toUpperCase()
                                  ) ? (
                                    <div className="h-4 w-4 bg-gray-900 rounded-sm flex items-center justify-center">
                                      <div className="h-2 w-2 bg-white" />
                                    </div>
                                  ) : (
                                    <div className="h-4 w-4 border border-gray-300 rounded-sm" />
                                  )}
                                  <span>{country.name}</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs ml-auto"
                                >
                                  {(country.iso2 || "").trim().toUpperCase()}
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

              {/* Selected Countries Display */}
              {selectedCountries.size > 0 && (
                <div>
                  <Label>Selected Countries ({selectedCountries.size})</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getSelectedCountryNames().map(({ code, name }) => (
                      <Badge
                        key={code}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        {name} ({code})
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                          onClick={() => handleCountrySelect(code)}
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
          <Link href="/admin/shipping/zones">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Updating..." : "Update Zone"}
          </Button>
        </div>
      </form>
    </div>
  );
}

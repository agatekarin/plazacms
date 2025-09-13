"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  priority: number;
  status: "active" | "inactive";
  countries: Array<{
    country_code: string;
    country_name: string;
  }>;
}

export default function CreateZonePage() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const [formData, setFormData] = useState<ZoneForm>({
    code: "",
    name: "",
    description: "",
    priority: 1,
    status: "active",
    countries: [],
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch("/api/admin/locations/all");
      if (!response.ok) throw new Error("Failed to fetch countries");

      const data = await response.json();
      setCountries(data.countries || []);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert selected countries to the format expected by API
      const countriesData = Array.from(selectedCountries).map((countryCode) => {
        const country = countries.find((c) => c.iso2 === countryCode);
        return {
          country_code: countryCode,
          country_name: country?.name || countryCode,
        };
      });

      const payload = {
        ...formData,
        countries: countriesData,
      };

      const response = await fetch("/api/admin/shipping/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create zone");
      }

      const result = await response.json();
      router.push(`/admin/shipping/zones/${result.zone.id}`);
    } catch (error) {
      console.error("Error creating zone:", error);
      alert(error instanceof Error ? error.message : "Failed to create zone");
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
            <MapPin className="h-6 w-6" />
            Create Shipping Zone
          </h1>
          <p className="text-gray-600 mt-1">
            Define a geographic coverage area for shipping
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Zone Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Zone Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="US, EU, ASIA, etc."
                  required
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier (uppercase, max 20 chars)
                </p>
              </div>
              <div>
                <Label htmlFor="name">Zone Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="United States, Europe, Asia Pacific, etc."
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe this shipping zone..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: parseInt(e.target.value) || 1,
                    }))
                  }
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers = higher priority (1-100)
                </p>
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
          </CardContent>
        </Card>

        {/* Country Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Country Coverage
            </CardTitle>
            <p className="text-sm text-gray-600">
              Select countries that belong to this shipping zone
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Country Selector */}
            <div>
              <Label>Select Countries</Label>
              <Popover
                open={countrySearchOpen}
                onOpenChange={setCountrySearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countrySearchOpen}
                    className="w-full justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search countries...
                    </div>
                    <Plus className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search countries..."
                      value={countrySearch}
                      onValueChange={setCountrySearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loadingCountries
                          ? "Loading countries..."
                          : "No countries found."}
                      </CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
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
                Create Zone
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

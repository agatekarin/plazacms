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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Plus, Trash2, MapPin, Globe, Save, Loader, Search } from "lucide-react";

interface Country {
  id: string;
  name: string;
  iso2: string;
}

interface State {
  id: string;
  name: string;
  country_id: string;
  country_name: string;
}

interface City {
  id: string;
  name: string;
  state_id: string;
  state_name: string;
  country_name: string;
  country_id: string;
}

interface ZoneLocation {
  id?: string;
  country_id: string;
  state_id: string;
  city_id: string;
  postal_codes: string[];
}

interface ZoneCreateFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editZone?: any;
}

export function ZoneCreateForm({
  onClose,
  onSuccess,
  editZone,
}: ZoneCreateFormProps) {
  const [formData, setFormData] = useState({
    name: editZone?.name || "",
    description: editZone?.description || "",
    status: editZone?.status || "active",
    zone_type: editZone?.zone_type || "location",
    priority: editZone?.priority || 0,
  });

  const [locations, setLocations] = useState<ZoneLocation[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // Search states for dropdowns
  const [countrySearch, setCountrySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Load all location data on mount
  useEffect(() => {
    loadAllLocations();
  }, []);

  const loadAllLocations = async () => {
    try {
      setLoadingData(true);
      const response = await fetch("/api/admin/locations/all");
      if (!response.ok) throw new Error("Failed to load location data");

      const data = await response.json();
      setCountries(data.countries || []);
      setAllStates(data.states || []);
      setAllCities(data.cities || []);
    } catch (err) {
      console.error("Failed to load locations:", err);
      setError("Failed to load location data");
    } finally {
      setLoadingData(false);
    }
  };

  // Filter functions for search
  const getFilteredCountries = () => {
    return countries.filter(country =>
      country.name.toLowerCase().includes(countrySearch.toLowerCase())
    );
  };

  const getFilteredStates = (countryId: string) => {
    return allStates.filter(state =>
      state.country_id === countryId &&
      state.name.toLowerCase().includes(stateSearch.toLowerCase())
    );
  };

  const getFilteredCities = (stateId: string) => {
    return allCities.filter(city =>
      city.state_id === stateId &&
      city.name.toLowerCase().includes(citySearch.toLowerCase())
    );
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addLocation = () => {
    setLocations((prev) => [
      ...prev,
      {
        country_id: "",
        state_id: "",
        city_id: "",
        postal_codes: [],
      },
    ]);
  };

  const updateLocation = (index: number, field: string, value: any) => {
    setLocations((prev) =>
      prev.map((loc, i) => (i === index ? { ...loc, [field]: value } : loc))
    );

    // Reset dependent fields when parent changes
    if (field === "country_id") {
      // Reset state and city when country changes
      setLocations((prev) =>
        prev.map((loc, i) =>
          i === index ? { ...loc, state_id: "", city_id: "" } : loc
        )
      );
      setStateSearch(''); // Clear state search
      setCitySearch(''); // Clear city search
    }

    if (field === "state_id") {
      // Reset city when state changes
      setLocations((prev) =>
        prev.map((loc, i) => (i === index ? { ...loc, city_id: "" } : loc))
      );
      setCitySearch(''); // Clear city search
    }
  };

  const removeLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Zone name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...formData,
        locations: locations.filter(
          (loc) => loc.country_id && loc.state_id && loc.city_id
        ),
      };

      const url = editZone
        ? `/api/admin/shipping/zones/${editZone.id}`
        : "/api/admin/shipping/zones";

      const method = editZone ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save zone");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save zone");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {editZone ? "Edit Shipping Zone" : "Create New Shipping Zone"}
            </CardTitle>
            <CardDescription>
              {editZone
                ? "Update shipping zone configuration"
                : "Define a new shipping coverage area"}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zone Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Indonesia, Jabodetabek, etc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  handleInputChange("priority", parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher priority zones are checked first
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zone Type
              </label>
              <select
                value={formData.zone_type}
                onChange={(e) => handleInputChange("zone_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="location">Location-based</option>
                <option value="postal">Postal code-based</option>
                <option value="custom">Custom rules</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description for this shipping zone"
            />
          </div>

          {/* Location Configuration */}
          {formData.zone_type === "location" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Zone Locations
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLocation}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Location
                </Button>
              </div>

              {locations.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No locations added yet</p>
                  <p className="text-sm text-gray-400">
                    Click &quot;Add Location&quot; to define coverage areas
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {locations.map((location, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Location {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLocation(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                             {/* Country Selection with Search */}
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Country
                         </label>
                         <div className="relative">
                           <input
                             type="text"
                             placeholder="Search countries..."
                             value={countrySearch}
                             onChange={(e) => setCountrySearch(e.target.value)}
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                             disabled={loadingData}
                           />
                           <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                         </div>
                         <select
                           value={location.country_id}
                           onChange={(e) =>
                             updateLocation(index, "country_id", e.target.value)
                           }
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                           disabled={loadingData}
                         >
                           <option value="">Select Country</option>
                           {getFilteredCountries().map((country) => (
                             <option key={country.id} value={country.id}>
                               {country.name}
                             </option>
                           ))}
                         </select>
                         {getFilteredCountries().length === 0 && countrySearch && (
                           <p className="text-xs text-gray-500 mt-1">No countries found</p>
                         )}
                       </div>

                       {/* State Selection with Search */}
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           State/Province
                         </label>
                         <div className="relative">
                           <input
                             type="text"
                             placeholder="Search states..."
                             value={stateSearch}
                             onChange={(e) => setStateSearch(e.target.value)}
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                             disabled={!location.country_id || loadingData}
                           />
                           <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                         </div>
                         <select
                           value={location.state_id}
                           onChange={(e) =>
                             updateLocation(index, "state_id", e.target.value)
                           }
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                           disabled={!location.country_id || loadingData}
                         >
                           <option value="">Select State</option>
                           {getFilteredStates(location.country_id).map((state) => (
                             <option key={state.id} value={state.id}>
                               {state.name}
                             </option>
                           ))}
                         </select>
                         {location.country_id && getFilteredStates(location.country_id).length === 0 && stateSearch && (
                           <p className="text-xs text-gray-500 mt-1">No states found</p>
                         )}
                       </div>

                       {/* City Selection with Search */}
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           City
                         </label>
                         <div className="relative">
                           <input
                             type="text"
                             placeholder="Search cities..."
                             value={citySearch}
                             onChange={(e) => setCitySearch(e.target.value)}
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                             disabled={!location.state_id || loadingData}
                           />
                           <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                         </div>
                         <select
                           value={location.city_id}
                           onChange={(e) =>
                             updateLocation(index, "city_id", e.target.value)
                           }
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                           disabled={!location.state_id || loadingData}
                         >
                           <option value="">Select City</option>
                           {getFilteredCities(location.state_id).map((city) => (
                             <option key={city.id} value={city.id}>
                               {city.name}
                             </option>
                           ))}
                         </select>
                         {location.state_id && getFilteredCities(location.state_id).length === 0 && citySearch && (
                           <p className="text-xs text-gray-500 mt-1">No cities found</p>
                         )}
                       </div>
                    </div>

                    {/* Postal Codes */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Codes (Optional)
                      </label>
                      <input
                        type="text"
                        value={location.postal_codes.join(", ")}
                        onChange={(e) =>
                          updateLocation(
                            index,
                            "postal_codes",
                            e.target.value
                              .split(",")
                              .map((code) => code.trim())
                              .filter(Boolean)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 12345, 12346, 12347"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Separate multiple postal codes with commas
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editZone ? "Update Zone" : "Create Zone"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

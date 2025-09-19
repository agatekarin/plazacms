"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import {
  Calculator,
  Package,
  MapPin,
  Network,
  DollarSign,
  Weight,
  Loader2,
  Clock,
  Zap,
  RefreshCw,
} from "lucide-react";

interface ShippingMethod {
  id: number;
  name: string;
  method_type: string;
  currency: string;
  calculated_cost: number;
  estimated_days_min: number;
  estimated_days_max: number;
  zone: {
    id: number;
    name: string;
    code: string;
    priority: number;
  };
  gateway: {
    id: number;
    name: string;
    code: string;
    type: string;
  };
}

interface CalculationResult {
  country_code: string;
  cart_total: number;
  total_weight_g: number;
  methods: ShippingMethod[];
  cheapest_method: ShippingMethod | null;
  summary: Array<{
    currency: string;
    methods_count: number;
    cheapest_cost: number;
    most_expensive_cost: number;
    free_shipping_available: boolean;
  }>;
  total_methods_found: number;
}

interface Country {
  country_code: string;
  country_name: string;
  zone_name: string;
  zone_code: string;
  methods_count: number;
}

export default function ShippingCalculatorPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const { apiCallJson } = useAuthenticatedFetch();

  // Form state
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [cartTotal, setCartTotal] = useState(100);
  const [totalWeight, setTotalWeight] = useState(1000);

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      // Load full countries list and overlay shipping coverage info
      const [allData, coveredData] = await Promise.all([
        apiCallJson("/api/admin/locations/countries?limit=300", {
          cache: "no-store",
        }).catch(() => ({ countries: [] })),
        apiCallJson("/api/admin/shipping/calculator", {
          cache: "no-store",
        }).catch(() => ({ countries: [] })),
      ]);

      const coveredMap = new Map<
        string,
        { zone_code?: string; zone_name?: string; methods_count?: number }
      >();
      (coveredData.countries || []).forEach((c: any) => {
        const code = (c.country_code || "").trim().toUpperCase();
        coveredMap.set(code, {
          zone_code: c.zone_code,
          zone_name: c.zone_name,
          methods_count: parseInt(c.methods_count || 0),
        });
      });

      const mapped = (allData.countries || []).map((c: any) => {
        const code = (c.iso2 || c.country_code || "").trim().toUpperCase();
        const info = coveredMap.get(code) || {};
        return {
          country_code: code,
          country_name: c.name || c.country_name || "",
          zone_name: info.zone_name || "",
          zone_code: info.zone_code || "",
          methods_count: info.methods_count || 0,
        } as Country;
      });

      setCountries(mapped);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedCountry || cartTotal <= 0 || totalWeight <= 0) {
      alert("Please fill in all fields with valid values");
      return;
    }

    try {
      setCalculating(true);
      setResult(null);
      const data = await apiCallJson("/api/admin/shipping/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: selectedCountry,
          cart_total: cartTotal,
          total_weight_g: totalWeight,
        }),
      });
      setResult(data);
    } catch (error) {
      console.error("Error calculating shipping:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to calculate shipping costs"
      );
    } finally {
      setCalculating(false);
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

  const getGatewayTypeColor = (type: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Shipping Rate Calculator
        </h1>
        <p className="text-gray-600 mt-1">
          Test shipping cost calculations for different countries and weights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculate Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="country">Destination Country *</Label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-full justify-between"
                      disabled={loadingCountries}
                    >
                      <span className="truncate">
                        {selectedCountry
                          ? countries.find(
                              (c) => c.country_code === selectedCountry
                            )?.country_name || selectedCountry
                          : loadingCountries
                          ? "Loading countries..."
                          : "Select country"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Search countries..." />
                      <CommandEmpty>No countries found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {countries.map((country, idx) => (
                          <CommandItem
                            key={`${country.country_code}-${idx}`}
                            value={`${country.country_name}-${country.country_code}`}
                            onSelect={() => {
                              setSelectedCountry(country.country_code);
                              setCountryOpen(false);
                            }}
                            className="cursor-pointer hover:bg-gray-50 aria-selected:bg-gray-100"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{country.country_name}</span>
                              <div className="flex items-center gap-2 ml-2">
                                {country.zone_code ? (
                                  <Badge variant="outline" className="text-xs">
                                    {country.zone_code}
                                  </Badge>
                                ) : null}
                                {country.methods_count > 0 ? (
                                  <span className="text-xs text-gray-500">
                                    {country.methods_count} methods
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="cart_total">Cart Total (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="cart_total"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cartTotal}
                    onChange={(e) =>
                      setCartTotal(parseFloat(e.target.value) || 0)
                    }
                    className="pl-10"
                    placeholder="100.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="total_weight">Total Weight (grams) *</Label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="total_weight"
                    type="number"
                    min="1"
                    value={totalWeight}
                    onChange={(e) =>
                      setTotalWeight(parseInt(e.target.value) || 1)
                    }
                    className="pl-10"
                    placeholder="1000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Weight in grams (1kg = 1000g)
                </p>
              </div>

              <Button
                onClick={handleCalculate}
                className="w-full"
                disabled={
                  calculating ||
                  !selectedCountry ||
                  cartTotal <= 0 ||
                  totalWeight <= 0
                }
              >
                {calculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Shipping
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Calculation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.total_methods_found}
                      </div>
                      <div className="text-sm text-gray-600">Methods Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.cheapest_method
                          ? `${
                              result.cheapest_method.currency
                            } ${result.cheapest_method.calculated_cost.toFixed(
                              2
                            )}`
                          : "N/A"}
                      </div>
                      <div className="text-sm text-gray-600">
                        Cheapest Option
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {totalWeight / 1000}kg
                      </div>
                      <div className="text-sm text-gray-600">
                        Package Weight
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ${cartTotal}
                      </div>
                      <div className="text-sm text-gray-600">Cart Value</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Available Shipping Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {result.methods.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        No shipping methods available for this destination
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {result.methods.map((method) => (
                        <div
                          key={method.id}
                          className={`p-4 ${
                            result.cheapest_method?.id === method.id
                              ? "bg-green-50 border-l-4 border-green-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{method.name}</h3>
                                {result.cheapest_method?.id === method.id && (
                                  <Badge className="bg-green-100 text-green-800">
                                    CHEAPEST
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-gray-500" />
                                  <Badge variant="outline">
                                    {method.zone.code}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Network className="h-3 w-3 text-gray-500" />
                                  <Badge
                                    variant="secondary"
                                    className={getGatewayTypeColor(
                                      method.gateway.type
                                    )}
                                  >
                                    {method.gateway.name}
                                  </Badge>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={getMethodTypeColor(
                                    method.method_type
                                  )}
                                >
                                  {method.method_type
                                    .replace("_", " ")
                                    .toUpperCase()}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                {method.calculated_cost === 0 ? (
                                  <span className="text-green-600">FREE</span>
                                ) : (
                                  `${
                                    method.currency
                                  } ${method.calculated_cost.toFixed(2)}`
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="h-3 w-3" />
                                {method.estimated_days_min ===
                                method.estimated_days_max
                                  ? `${method.estimated_days_min} days`
                                  : `${method.estimated_days_min}-${method.estimated_days_max} days`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-8">
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Select a country and enter order details to calculate
                    shipping costs
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

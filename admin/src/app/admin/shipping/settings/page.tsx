"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Globe,
  DollarSign,
  Weight,
  Package,
  Shield,
  Clock,
  AlertCircle,
  Save,
  Loader2,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface ShippingSettings {
  default_country: string;
  default_currency: string;
  weight_unit: string;
  dimension_unit: string;
  enable_free_shipping: boolean;
  free_shipping_threshold: number;
  max_weight_limit: number;
  enable_shipping_zones: boolean;
  enable_shipping_calculator: boolean;
  shipping_tax_status: string;
  shipping_tax_class: string;
  hide_shipping_until_address: boolean;
  enable_debug_mode: boolean;
}

export default function ShippingSettingsPage() {
  const { apiCallJson } = useAuthenticatedFetch();
  const [settings, setSettings] = useState<ShippingSettings>({
    default_country: "ID",
    default_currency: "IDR",
    weight_unit: "g",
    dimension_unit: "cm",
    enable_free_shipping: true,
    free_shipping_threshold: 100000,
    max_weight_limit: 30000,
    enable_shipping_zones: true,
    enable_shipping_calculator: true,
    shipping_tax_status: "taxable",
    shipping_tax_class: "standard",
    hide_shipping_until_address: false,
    enable_debug_mode: false,
  });

  type Country = { iso2: string; name: string };
  const [countries, setCountries] = useState<Country[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
    loadCountries();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await apiCallJson("/api/admin/settings/shipping", {
        cache: "no-store",
      }).catch(() => ({} as any));
      if (data?.settings) {
        if (data?.settings) {
          setSettings(data.settings);
        }
      } else {
        // fallback to localStorage if API not ready
        const saved = localStorage.getItem("shipping_settings");
        if (saved) setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const data = await apiCallJson(
        "/api/admin/locations/countries?limit=300",
        {
          cache: "no-store",
        }
      );
      if (Array.isArray(data.countries)) {
        setCountries(
          data.countries.map((c: any) => ({
            iso2: (c.iso2 || c.code || "").trim().toUpperCase(),
            name: c.name || c.country_name || "",
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load countries", e);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await apiCallJson("/api/admin/settings/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setLastSaved(new Date());
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof ShippingSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: settings.default_currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Shipping Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure global shipping preferences and defaults
          </p>
        </div>

        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Country
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.default_country}
                onChange={(e) =>
                  updateSetting("default_country", e.target.value)
                }
              >
                {countries.length === 0 ? (
                  <>
                    <option value="US">United States</option>
                    <option value="ID">Indonesia</option>
                  </>
                ) : (
                  countries.map((c) => (
                    <option key={c.iso2} value={c.iso2}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Default Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Currency
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.default_currency}
                onChange={(e) =>
                  updateSetting("default_currency", e.target.value)
                }
              >
                <option value="IDR">Indonesian Rupiah (IDR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="MYR">Malaysian Ringgit (MYR)</option>
                <option value="SGD">Singapore Dollar (SGD)</option>
              </select>
            </div>

            {/* Weight Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight Unit
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.weight_unit}
                onChange={(e) => updateSetting("weight_unit", e.target.value)}
              >
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="lbs">Pounds (lbs)</option>
                <option value="oz">Ounces (oz)</option>
              </select>
            </div>

            {/* Dimension Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimension Unit
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.dimension_unit}
                onChange={(e) =>
                  updateSetting("dimension_unit", e.target.value)
                }
              >
                <option value="cm">Centimeters (cm)</option>
                <option value="m">Meters (m)</option>
                <option value="in">Inches (in)</option>
                <option value="ft">Feet (ft)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Free Shipping Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Free Shipping Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Free Shipping */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Free Shipping
                </label>
                <p className="text-xs text-gray-500">
                  Allow free shipping options for customers
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={settings.enable_free_shipping}
                onChange={(e) =>
                  updateSetting("enable_free_shipping", e.target.checked)
                }
              />
            </div>

            {/* Free Shipping Threshold */}
            {settings.enable_free_shipping && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Free Shipping Threshold
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={settings.free_shipping_threshold}
                    onChange={(e) =>
                      updateSetting(
                        "free_shipping_threshold",
                        Number(e.target.value)
                      )
                    }
                    min="0"
                  />
                  <span className="absolute right-2 top-2 text-sm text-gray-500">
                    {settings.default_currency}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {formatCurrency(settings.free_shipping_threshold)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight & Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight className="h-5 w-5" />
              Weight & Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max Weight Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Weight Limit ({settings.weight_unit})
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.max_weight_limit}
                onChange={(e) =>
                  updateSetting("max_weight_limit", Number(e.target.value))
                }
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum weight allowed for shipping calculations
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Feature Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Shipping Zones */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Shipping Zones
                </label>
                <p className="text-xs text-gray-500">
                  Use geographic zones for shipping calculations
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={settings.enable_shipping_zones}
                onChange={(e) =>
                  updateSetting("enable_shipping_zones", e.target.checked)
                }
              />
            </div>

            {/* Enable Shipping Calculator */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Shipping Calculator
                </label>
                <p className="text-xs text-gray-500">
                  Show shipping cost calculator on frontend
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={settings.enable_shipping_calculator}
                onChange={(e) =>
                  updateSetting("enable_shipping_calculator", e.target.checked)
                }
              />
            </div>

            {/* Hide Shipping Until Address */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Hide Shipping Until Address
                </label>
                <p className="text-xs text-gray-500">
                  Don&apos;t show shipping options until address is entered
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={settings.hide_shipping_until_address}
                onChange={(e) =>
                  updateSetting("hide_shipping_until_address", e.target.checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tax Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Shipping Tax Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Tax Status
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={settings.shipping_tax_status}
                onChange={(e) =>
                  updateSetting("shipping_tax_status", e.target.value)
                }
              >
                <option value="taxable">Taxable</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* Shipping Tax Class */}
            {settings.shipping_tax_status === "taxable" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Tax Class
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={settings.shipping_tax_class}
                  onChange={(e) =>
                    updateSetting("shipping_tax_class", e.target.value)
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="reduced">Reduced</option>
                  <option value="zero">Zero Rate</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Debug Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Debug Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Debug Mode
                </label>
                <p className="text-xs text-gray-500">
                  Show detailed shipping calculation logs
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={settings.enable_debug_mode}
                onChange={(e) =>
                  updateSetting("enable_debug_mode", e.target.checked)
                }
              />
            </div>

            {settings.enable_debug_mode && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Debug Mode Enabled
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Debug information will be logged and may affect performance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

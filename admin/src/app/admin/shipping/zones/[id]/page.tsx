"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Edit,
  Trash2,
  Globe,
  AlertCircle,
  CheckCircle,
  Network,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
}

interface ShippingZone {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  priority: number;
  created_at: string;
  updated_at: string;
  countries_count: number;
  gateways_count: number;
  methods_count: number;
  countries: Country[];
}

export default function ShippingZoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [zone, setZone] = useState<ShippingZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchZone();
  }, [resolvedParams.id]);

  const fetchZone = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/shipping/zones/${resolvedParams.id}`
      );

      if (!response.ok) {
        throw new Error("Zone not found");
      }

      const data = await response.json();
      const countries = Array.isArray(data.countries)
        ? data.countries.map((c: any) => ({
            iso2: (c.country_code || "").trim().toUpperCase(),
            name: c.country_name || c.name || c.country_code || "",
            iso3: "",
            id: 0,
          }))
        : [];
      setZone({ ...data.zone, countries });
    } catch (error) {
      console.error("Error fetching zone:", error);
      alert("Failed to load zone details");
      router.push("/admin/shipping/zones");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(
        `/api/admin/shipping/zones/${resolvedParams.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete zone");
      }

      router.push("/admin/shipping/zones");
    } catch (error) {
      console.error("Error deleting zone:", error);
      alert(error instanceof Error ? error.message : "Failed to delete zone");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">Zone not found</h2>
        <p className="text-gray-500 mt-2">
          The requested shipping zone could not be found.
        </p>
        <Link href="/admin/shipping/zones">
          <Button className="mt-4">Back to Zones</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/shipping/zones">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Zones
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">{zone.name}</h1>
              <p className="text-gray-600">Zone Code: {zone.code}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getStatusColor(zone.status)}>
            {zone.status === "active" ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {zone.status.toUpperCase()}
          </Badge>

          <Link href={`/admin/shipping/zones/${zone.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shipping Zone</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{zone.name}&quot;? This
                  action cannot be undone and will affect all related shipping
                  methods.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete Zone"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Zone Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Zone Code
                </label>
                <p className="text-sm text-gray-700 mt-1">{zone.code}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Priority
                </label>
                <p className="text-sm text-gray-700 mt-1">{zone.priority}</p>
              </div>
            </div>

            {zone.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="text-sm text-gray-700 mt-1">{zone.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(zone.created_at).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Last Updated
                </label>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(zone.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Coverage Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {zone.countries_count}
                </div>
                <div className="text-xs text-gray-500">Countries</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {zone.gateways_count}
                </div>
                <div className="text-xs text-gray-500">Gateways</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {zone.methods_count}
                </div>
                <div className="text-xs text-gray-500">Methods</div>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Quick Actions</span>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/shipping/gateways" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Network className="h-4 w-4 mr-2" />
                    View Gateways
                  </Button>
                </Link>
                <Link href="/admin/shipping/methods" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Package className="h-4 w-4 mr-2" />
                    View Methods
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countries List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Covered Countries ({zone.countries_count})
            </CardTitle>
            <CardDescription>
              Countries included in this shipping zone
            </CardDescription>
          </CardHeader>
          <CardContent>
            {zone.countries && zone.countries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {zone.countries.map((country) => (
                  <Badge
                    key={country.iso2}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <span>{country.name}</span>
                    <span className="text-xs text-gray-500">
                      ({country.iso2})
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No countries assigned to this zone</p>
                <Link href={`/admin/shipping/zones/${zone.id}/edit`}>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Countries
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

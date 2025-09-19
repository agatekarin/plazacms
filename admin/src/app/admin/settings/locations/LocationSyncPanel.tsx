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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  RefreshCw,
  Database,
  Globe,
  MapPin,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";

interface SyncStatus {
  latest_version: string;
  current_version: string;
  update_available: boolean;
  last_sync: string;
  release_date: string;
  total_countries: number;
  total_states: number;
  total_cities: number;
}

interface ImportProgress {
  id: string;
  status: "pending" | "downloading" | "importing" | "completed" | "failed";
  progress: number;
  message: string;
  records_imported?: number;
  error?: string;
  started_at: string;
  completed_at?: string;
}

export function LocationSyncPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const { apiCallJson } = useAuthenticatedFetch();
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv">("csv");
  const [selectedTables, setSelectedTables] = useState([
    "countries",
    "states",
    "cities",
  ]);

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    try {
      const data = await apiCallJson("/api/admin/locations/sync", {
        cache: "no-store",
      });
      setSyncStatus(data);
    } catch (error) {
      console.error("Failed to check sync status:", error);
    }
  };

  const startImport = async () => {
    setLoading(true);
    try {
      const data = await apiCallJson("/api/admin/locations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: selectedFormat,
          tables: selectedTables,
        }),
      });

      if (data.import_id) {
        // Start polling for progress
        pollImportProgress(data.import_id);
      } else {
        console.error("Import failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to start import:", error);
    } finally {
      setLoading(false);
    }
  };

  const pollImportProgress = (importId: string) => {
    const poll = setInterval(async () => {
      try {
        const progress = await apiCallJson(
          `/api/admin/locations/sync/progress/${importId}`,
          { cache: "no-store" }
        );

        setImportProgress(progress);

        if (progress.status === "completed" || progress.status === "failed") {
          clearInterval(poll);
          if (progress.status === "completed") {
            // Refresh status after successful import
            setTimeout(() => {
              checkSyncStatus();
            }, 1000);
          }
        }
      } catch (error) {
        clearInterval(poll);
        console.error("Failed to check progress:", error);
      }
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tableInfo = [
    {
      id: "countries",
      label: "Countries",
      icon: Globe,
      count: syncStatus?.total_countries || 250,
      description: "All countries worldwide",
    },
    {
      id: "states",
      label: "States/Provinces",
      icon: MapPin,
      count: syncStatus?.total_states || 5038,
      description: "States, provinces, regions",
    },
    {
      id: "cities",
      label: "Cities",
      icon: Building,
      count: syncStatus?.total_cities || 151024,
      description: "Cities, towns, districts",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Location Database Status
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            Global countries, states, and cities data from{" "}
            <a
              href="https://github.com/dr5hn/countries-states-cities-database"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              countries-states-cities-database
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Database className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium">Current Version</p>
                  <p className="text-sm text-gray-600">
                    {syncStatus.current_version === "none"
                      ? "Not installed"
                      : syncStatus.current_version}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <RefreshCw className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium">Latest Version</p>
                  <p className="text-sm text-gray-600">
                    {syncStatus.latest_version}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="font-medium">Last Sync</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(syncStatus.last_sync)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncStatus?.update_available && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                A new version ({syncStatus.latest_version}) is available!
                Released: {formatDate(syncStatus.release_date)}
              </AlertDescription>
            </Alert>
          )}

          {syncStatus?.current_version === "none" && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                No location data found in database. Please import data to enable
                location-based shipping zones.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import Configuration
          </CardTitle>
          <CardDescription>
            Choose data format and tables to import from GitHub repository
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Data Format
            </label>
            <div className="flex gap-2">
              <Button
                variant={selectedFormat === "csv" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("csv")}
                className="flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                CSV (Recommended)
              </Button>
              <Button
                variant={selectedFormat === "json" ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("json")}
                className="flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                JSON
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              CSV is faster for large datasets, JSON provides better validation
            </p>
          </div>

          {/* Table Selection */}
          <div>
            <label className="text-sm font-medium block mb-3">
              Tables to Import
            </label>
            <div className="grid grid-cols-1 gap-3">
              {tableInfo.map((table) => (
                <div
                  key={table.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={table.id}
                      checked={selectedTables.includes(table.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTables([...selectedTables, table.id]);
                        } else {
                          setSelectedTables(
                            selectedTables.filter((t) => t !== table.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <table.icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={table.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {table.label}
                        </label>
                        <Badge variant="secondary" className="text-xs">
                          {table.count.toLocaleString()}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {table.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Import Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={startImport}
              disabled={
                loading ||
                selectedTables.length === 0 ||
                Boolean(
                  importProgress &&
                    ["pending", "downloading", "importing"].includes(
                      importProgress.status
                    )
                )
              }
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {loading ? "Starting Import..." : "Start Import"}
            </Button>

            <Button
              variant="outline"
              onClick={checkSyncStatus}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check Status
            </Button>
          </div>

          {selectedTables.length === 0 && (
            <p className="text-sm text-red-600">
              Please select at least one table to import.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importProgress.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : importProgress.status === "failed" ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              )}
              Import Progress
            </CardTitle>
            <CardDescription>
              Started at: {formatDate(importProgress.started_at)}
              {importProgress.completed_at && (
                <> • Completed at: {formatDate(importProgress.completed_at)}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  {importProgress.message}
                </span>
                <span className="text-sm text-gray-500">
                  {importProgress.progress}%
                </span>
              </div>
              <Progress
                value={importProgress.progress}
                className={`w-full h-2 ${
                  importProgress.status === "completed"
                    ? "bg-green-100"
                    : importProgress.status === "failed"
                    ? "bg-red-100"
                    : "bg-blue-100"
                }`}
              />
            </div>

            {importProgress.records_imported && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                📊 Imported {importProgress.records_imported.toLocaleString()}{" "}
                records
              </div>
            )}

            {importProgress.status === "completed" && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Location data import completed successfully! You can now
                  create shipping zones based on countries, states, and cities.
                </AlertDescription>
              </Alert>
            )}

            {importProgress.status === "failed" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import failed:{" "}
                  {importProgress.error || importProgress.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Database Statistics</CardTitle>
          <CardDescription>
            Data from countries-states-cities-database repository
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tableInfo.map((table) => (
              <div
                key={table.id}
                className="p-4 border rounded-lg text-center hover:bg-gray-50 transition-colors"
              >
                <table.icon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">
                  {table.count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">{table.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Coverage Includes:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 250 countries with ISO codes, currencies, and timezones</li>
              <li>• 5,038 states/provinces with geographical coordinates</li>
              <li>• 151,024 cities with latitude/longitude data</li>
              <li>
                • Complete hierarchy: Country → State → City relationships
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

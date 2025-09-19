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
  Loader2,
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
  table: string;
  status: "pending" | "downloading" | "importing" | "completed" | "failed";
  progress: number;
  message: string;
  records_imported?: number;
  records_updated?: number;
  records_new?: number;
  error?: string;
  started_at: string;
  completed_at?: string;
}

export function LocationSyncPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const { apiCallJson } = useAuthenticatedFetch();

  // Individual progress tracking for each table
  const [importProgress, setImportProgress] = useState<{
    countries?: ImportProgress;
    states?: ImportProgress;
    cities?: ImportProgress;
  }>({});

  const [loadingStates, setLoadingStates] = useState<{
    countries: boolean;
    states: boolean;
    cities: boolean;
  }>({
    countries: false,
    states: false,
    cities: false,
  });

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

  const startTableImport = async (table: "countries" | "states" | "cities") => {
    setLoadingStates((prev) => ({ ...prev, [table]: true }));

    try {
      const data = await apiCallJson(`/api/admin/locations/sync/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "csv", // Always use CSV for efficiency
        }),
      });

      if (data.import_id) {
        // Start polling for progress
        pollTableImportProgress(data.import_id, table);
      } else {
        console.error(`${table} import failed:`, data.error);
      }
    } catch (error) {
      console.error(`Failed to start ${table} import:`, error);
      setLoadingStates((prev) => ({ ...prev, [table]: false }));
    }
  };

  const pollTableImportProgress = (importId: string, table: string) => {
    const poll = setInterval(async () => {
      try {
        const progress = await apiCallJson(
          `/api/admin/locations/sync/progress/${importId}`,
          { cache: "no-store" }
        );

        setImportProgress((prev) => ({
          ...prev,
          [table]: progress,
        }));

        if (progress.status === "completed" || progress.status === "failed") {
          clearInterval(poll);
          setLoadingStates((prev) => ({ ...prev, [table]: false }));

          if (progress.status === "completed") {
            // Refresh status after successful import
            setTimeout(() => {
              checkSyncStatus();
            }, 1000);
          }
        }
      } catch (error) {
        clearInterval(poll);
        setLoadingStates((prev) => ({ ...prev, [table]: false }));
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
      id: "countries" as const,
      label: "Countries",
      icon: Globe,
      count: syncStatus?.total_countries || 250,
      description:
        "All countries worldwide with ISO codes, currencies, and timezones",
      color: "blue",
    },
    {
      id: "states" as const,
      label: "States/Provinces",
      icon: MapPin,
      count: syncStatus?.total_states || 5038,
      description: "States, provinces, regions with geographical coordinates",
      color: "green",
    },
    {
      id: "cities" as const,
      label: "Cities",
      icon: Building,
      count: syncStatus?.total_cities || 151024,
      description: "Cities, towns, districts with latitude/longitude data",
      color: "purple",
    },
  ];

  const isTableImporting = (tableId: string) => {
    const progress = importProgress[tableId as keyof typeof importProgress];
    return (
      progress &&
      ["pending", "downloading", "importing"].includes(progress.status)
    );
  };

  const getTableStatus = (tableId: string) => {
    const progress = importProgress[tableId as keyof typeof importProgress];
    if (!progress) return null;

    return progress.status;
  };

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

          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={checkSyncStatus}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Import Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tableInfo.map((table) => {
          const progress = importProgress[table.id];
          const isImporting = isTableImporting(table.id);
          const status = getTableStatus(table.id);

          return (
            <Card key={table.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${table.color}-100`}>
                      <table.icon
                        className={`w-6 h-6 text-${table.color}-600`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{table.label}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {table.count.toLocaleString()} records
                        </Badge>
                        {status === "completed" && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Updated
                          </Badge>
                        )}
                        {status === "failed" && (
                          <Badge className="text-xs bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {table.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Import Progress */}
                {progress && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{progress.message}</span>
                      <span className="text-gray-500">
                        {progress.progress}%
                      </span>
                    </div>

                    <Progress
                      value={progress.progress}
                      className={`w-full h-2 ${
                        progress.status === "completed"
                          ? "bg-green-100"
                          : progress.status === "failed"
                          ? "bg-red-100"
                          : `bg-${table.color}-100`
                      }`}
                    />

                    {progress.records_imported && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded grid grid-cols-3 gap-2">
                        <div>
                          📊{" "}
                          <strong>
                            {progress.records_imported.toLocaleString()}
                          </strong>{" "}
                          imported
                        </div>
                        {progress.records_new && (
                          <div>
                            ✨{" "}
                            <strong>
                              {progress.records_new.toLocaleString()}
                            </strong>{" "}
                            new
                          </div>
                        )}
                        {progress.records_updated && (
                          <div>
                            🔄{" "}
                            <strong>
                              {progress.records_updated.toLocaleString()}
                            </strong>{" "}
                            updated
                          </div>
                        )}
                      </div>
                    )}

                    {progress.error && (
                      <Alert className="text-xs border-red-200 bg-red-50">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {progress.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="text-xs text-gray-500">
                      Started: {formatDate(progress.started_at)}
                      {progress.completed_at && (
                        <> • Completed: {formatDate(progress.completed_at)}</>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Button */}
                <Button
                  onClick={() => startTableImport(table.id)}
                  disabled={isImporting || loadingStates[table.id]}
                  className={`w-full flex items-center gap-2 bg-${table.color}-600 hover:bg-${table.color}-700`}
                  size="sm"
                >
                  {isImporting || loadingStates[table.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Import {table.label}
                    </>
                  )}
                </Button>

                {/* Help text */}
                <p className="text-xs text-gray-500">
                  Uses incremental import (upsert) - preserves existing data and
                  adds new records.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Import Information */}
      <Card>
        <CardHeader>
          <CardTitle>Import Information</CardTitle>
          <CardDescription>How incremental imports work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />✅ What Happens
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-6">
                <li>
                  • <strong>Preserves existing data</strong> - no deletion
                </li>
                <li>
                  • <strong>Adds new records</strong> from GitHub updates
                </li>
                <li>
                  • <strong>Updates changed records</strong> with latest info
                </li>
                <li>
                  • <strong>Chunked processing</strong> - 25 records per batch
                </li>
                <li>
                  • <strong>Rate-limit friendly</strong> - optimized for CF
                  Workers
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <Database className="w-4 h-4" />
                📊 Technical Details
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-6">
                <li>
                  • <strong>Source:</strong> countries-states-cities-database
                </li>
                <li>
                  • <strong>Format:</strong> CSV (faster processing)
                </li>
                <li>
                  • <strong>Method:</strong> UPSERT (INSERT ... ON CONFLICT
                  UPDATE)
                </li>
                <li>
                  • <strong>Batch Size:</strong> 25 rows/batch
                </li>
                <li>
                  • <strong>Retry Logic:</strong> Auto-retry on connection
                  issues
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Expected Coverage:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <strong>Countries:</strong> ~250
                <br />
                ISO codes, currencies, timezones
              </div>
              <div>
                <strong>States:</strong> ~5,000
                <br />
                Provinces, regions with coordinates
              </div>
              <div>
                <strong>Cities:</strong> ~150,000
                <br />
                Towns, districts with lat/lng
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

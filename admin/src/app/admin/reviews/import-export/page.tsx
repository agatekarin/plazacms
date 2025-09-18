"use client";

import { useState, useCallback } from "react";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  Database,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import toast from "react-hot-toast";

interface ImportExportStats {
  total_reviews: number;
  reviews_with_images: number;
  last_export_date?: string;
  last_import_date?: string;
}

export default function ReviewImportExportPage() {
  const { apiCallJson, uploadWithProgress } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Operation failed");
    },
  });

  const [stats, setStats] = useState<ImportExportStats | null>(null);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportStatus, setExportStatus] = useState("pending");
  const [exportProgress, setExportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("pending");
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson("/api/admin/reviews/import-export/stats");
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson]);

  // Export reviews
  const handleExport = async () => {
    try {
      setExportStatus("exporting");
      setExportProgress(0);

      const response = await fetch(
        `/api/admin/reviews/import-export/export?format=${exportFormat}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth-token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Simulate progress
      const interval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviews-export-${
        new Date().toISOString().split("T")[0]
      }.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportProgress(100);
      setExportStatus("completed");
      toast.success("Reviews exported successfully");

      // Reset after delay
      setTimeout(() => {
        setExportStatus("pending");
        setExportProgress(0);
      }, 3000);
    } catch (error) {
      setExportStatus("error");
      toast.error("Failed to export reviews");
    }
  };

  // Import reviews
  const handleImport = async (file: File) => {
    try {
      setImportStatus("importing");
      setImportProgress(0);
      setImportResults(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await uploadWithProgress(
        "/api/admin/reviews/import-export/import",
        formData,
        (progress) => {
          setImportProgress(progress);
        }
      );

      setImportResults(response);
      setImportStatus("completed");
      toast.success("Reviews imported successfully");

      // Refresh stats
      fetchStats();
    } catch (error) {
      setImportStatus("error");
      toast.error("Failed to import reviews");
    }
  };

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Import & Export Reviews
          </h1>
          <p className="text-gray-600">
            Manage review data import and export operations
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Reviews
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total_reviews.toLocaleString()}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Reviews with Images
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.reviews_with_images.toLocaleString()}
                    </p>
                  </div>
                  <ImageIcon className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Last Export
                    </p>
                    <p className="text-sm text-gray-900">
                      {stats.last_export_date
                        ? new Date(stats.last_export_date).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Export Format
                </label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
                    <SelectItem value="json">JSON (with images)</SelectItem>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Export includes:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Review content and ratings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Customer information
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Product details
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Order information
                  </li>
                  {exportFormat === "json" && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Review images (URLs)
                    </li>
                  )}
                </ul>
              </div>

              {exportStatus === "exporting" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Exporting reviews...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              )}

              {exportStatus === "completed" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">
                    Export completed successfully
                  </span>
                </div>
              )}

              {exportStatus === "error" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-800">Export failed</span>
                </div>
              )}

              <Button
                onClick={handleExport}
                disabled={exportStatus === "exporting"}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Reviews
              </Button>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Import File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Choose a CSV or JSON file to import
                  </p>
                  <input
                    type="file"
                    accept=".csv,.json,.xlsx"
                    onChange={handleFileInput}
                    className="hidden"
                    id="import-file"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("import-file")?.click()
                    }
                    disabled={importStatus === "importing"}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Supported formats:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    CSV (Excel compatible)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    JSON (with image URLs)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Excel (.xlsx)
                  </li>
                </ul>
              </div>

              {importStatus === "importing" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing reviews...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              {importStatus === "completed" && importResults && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">
                      Import completed successfully
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Imported:</span>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        {importResults.imported_count}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Skipped:</span>
                      <Badge
                        variant="outline"
                        className="bg-yellow-50 text-yellow-700"
                      >
                        {importResults.skipped_count}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700"
                      >
                        {importResults.error_count}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Images:</span>
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700"
                      >
                        {importResults.images_processed}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {importStatus === "error" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-800">Import failed</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Import Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Required Fields
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>product_id (UUID)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>user_id (UUID)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>rating (1-5)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>comment (text)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Optional Fields
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>order_id (UUID)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>order_item_id (UUID)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>is_verified_purchase (boolean)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>image_urls (comma-separated)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Duplicate reviews (same product_id +
                  user_id) will be skipped. Image URLs will be downloaded and
                  stored in R2 storage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

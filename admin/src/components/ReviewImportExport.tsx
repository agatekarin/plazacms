"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import toast from "react-hot-toast";
import {
  Download,
  Upload,
  FileText,
  Image,
  Database,
  CheckCircle,
  AlertTriangle,
  Info,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  failed: number;
  errors: string[];
}

interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  includeImages: boolean;
  includeHelpfulVotes: boolean;
  includeAdminResponses: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  status: string[];
  rating: number[];
}

export function ReviewImportExport() {
  const { apiCallJson, uploadWithProgress } = useAuthenticatedFetch({
    onError: (url, error) => {
      toast.error(error?.message || "Import/Export operation failed");
    },
  });

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "csv",
    includeImages: true,
    includeHelpfulVotes: true,
    includeAdminResponses: true,
    dateRange: {
      start: "",
      end: "",
    },
    status: ["approved", "pending", "rejected"],
    rating: [1, 2, 3, 4, 5],
  });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const params = new URLSearchParams({
        format: exportOptions.format,
        includeImages: exportOptions.includeImages.toString(),
        includeHelpfulVotes: exportOptions.includeHelpfulVotes.toString(),
        includeAdminResponses: exportOptions.includeAdminResponses.toString(),
        status: exportOptions.status.join(","),
        rating: exportOptions.rating.join(","),
        ...(exportOptions.dateRange.start && {
          startDate: exportOptions.dateRange.start,
        }),
        ...(exportOptions.dateRange.end && {
          endDate: exportOptions.dateRange.end,
        }),
      });

      const response = await apiCallJson(`/api/admin/reviews/export?${params}`);

      clearInterval(progressInterval);
      setExportProgress(100);

      // Create download link
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviews-export-${new Date().toISOString().split("T")[0]}.${
        exportOptions.format
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Export completed successfully!`);
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [exportOptions, apiCallJson]);

  const handleImport = useCallback(async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("includeImages", exportOptions.includeImages.toString());

      const result = await uploadWithProgress(
        "/api/admin/reviews/import",
        formData,
        (progress) => {
          setImportProgress(progress);
        }
      );

      setImportResult(result);

      if (result.success) {
        toast.success(`Import completed: ${result.imported} reviews imported`);
      } else {
        toast.error(`Import failed: ${result.message}`);
      }
    } catch (error) {
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  }, [importFile, exportOptions.includeImages, uploadWithProgress]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setImportFile(file);
        setImportResult(null);
      }
    },
    []
  );

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "csv":
        return <FileText className="h-4 w-4" />;
      case "json":
        return <FileJson className="h-4 w-4" />;
      case "xlsx":
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: "csv" | "json" | "xlsx") =>
                  setExportOptions((prev) => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={exportOptions.dateRange.start}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value },
                    }))
                  }
                  className="px-3 py-2 border rounded-md text-sm"
                />
                <input
                  type="date"
                  value={exportOptions.dateRange.end}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value },
                    }))
                  }
                  className="px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Include in Export</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-images"
                  checked={exportOptions.includeImages}
                  onCheckedChange={(checked: boolean) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeImages: checked,
                    }))
                  }
                />
                <Label
                  htmlFor="include-images"
                  className="flex items-center gap-2"
                >
                  <Image className="h-4 w-4" />
                  Review Images
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-votes"
                  checked={exportOptions.includeHelpfulVotes}
                  onCheckedChange={(checked: boolean) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeHelpfulVotes: checked,
                    }))
                  }
                />
                <Label
                  htmlFor="include-votes"
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Helpful Votes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-responses"
                  checked={exportOptions.includeAdminResponses}
                  onCheckedChange={(checked: boolean) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeAdminResponses: checked,
                    }))
                  }
                />
                <Label
                  htmlFor="include-responses"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Admin Responses
                </Label>
              </div>
            </div>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting reviews...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                {getFormatIcon(exportOptions.format)}
                Export Reviews
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Import reviews from CSV, JSON, or Excel files. Make sure your file
              includes the required columns: product_id, user_id, rating, title,
              comment, status.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Select File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            {importFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="import-images"
              checked={exportOptions.includeImages}
              onCheckedChange={(checked: boolean) =>
                setExportOptions((prev) => ({
                  ...prev,
                  includeImages: checked,
                }))
              }
            />
            <Label htmlFor="import-images" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Import Images (if available)
            </Label>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing reviews...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!importFile || isImporting}
            className="w-full flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Reviews
              </>
            )}
          </Button>

          {importResult && (
            <Alert
              className={
                importResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{importResult.message}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">
                      Imported: {importResult.imported}
                    </span>
                    <span className="text-red-600">
                      Failed: {importResult.failed}
                    </span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>
                            ... and {importResult.errors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

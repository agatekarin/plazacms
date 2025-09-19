"use client";

import { useState, useCallback, useEffect } from "react";
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
  Package,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  BarChart3,
  Layers,
  Archive,
  Tag,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import toast from "react-hot-toast";

interface ProductImportExportStats {
  total_products: number;
  published_products: number;
  draft_products: number;
  products_with_images: number;
  products_with_variants: number;
  total_variants: number;
  out_of_stock_products: number;
  on_sale_products: number;
  average_price: number;
  categories_count: number;
  last_export_date?: string;
  last_import_date?: string;
}

export default function ProductImportExportPage() {
  const { apiCallJson, apiCall, uploadWithProgress } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Operation failed");
    },
  });

  const [stats, setStats] = useState<ProductImportExportStats | null>(null);
  const [exportFormat, setExportFormat] = useState("csv");
  const [importMode, setImportMode] = useState("upsert");
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
      const data = await apiCallJson("/api/admin/products/import-export/stats");
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson]);

  // Call fetchStats on component mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Export products
  const handleExport = async () => {
    try {
      setExportStatus("exporting");
      setExportProgress(0);

      const response = await apiCall(
        `/api/admin/products/import-export/export?format=${exportFormat}`
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
      a.download = `products-export-${
        new Date().toISOString().split("T")[0]
      }.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportProgress(100);
      setExportStatus("completed");
      toast.success("Products exported successfully");

      // Reset after delay
      setTimeout(() => {
        setExportStatus("pending");
        setExportProgress(0);
      }, 3000);
    } catch (error) {
      setExportStatus("error");
      toast.error("Failed to export products");
    }
  };

  // Import products
  const handleImport = async (file: File) => {
    try {
      setImportStatus("importing");
      setImportProgress(0);
      setImportResults(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await uploadWithProgress(
        `/api/admin/products/import-export/import?mode=${importMode}`,
        formData,
        (progress) => {
          setImportProgress(progress);
        }
      );

      setImportResults(response);
      setImportStatus("completed");
      toast.success("Products imported successfully");

      // Refresh stats
      fetchStats();
    } catch (error) {
      setImportStatus("error");
      toast.error("Failed to import products");
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
            Products Import & Export
          </h1>
          <p className="text-gray-600">
            Manage product data import, export operations, and analytics
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Products
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total_products.toLocaleString()}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Published
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {stats.published_products.toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      With Images
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {stats.products_with_images.toLocaleString()}
                    </p>
                  </div>
                  <Layers className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Average Price
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      ${Number(stats.average_price || 0).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Stats Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Variants
                    </p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {stats.total_variants.toLocaleString()}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Out of Stock
                    </p>
                    <p className="text-2xl font-bold text-red-700">
                      {stats.out_of_stock_products.toLocaleString()}
                    </p>
                  </div>
                  <Archive className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">On Sale</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {stats.on_sale_products.toLocaleString()}
                    </p>
                  </div>
                  <Tag className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Categories
                    </p>
                    <p className="text-2xl font-bold text-teal-700">
                      {stats.categories_count.toLocaleString()}
                    </p>
                  </div>
                  <Layers className="w-8 h-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import/Export Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Products
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Export includes:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Product information and pricing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Inventory and stock levels
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Categories and attributes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Product variants and images
                  </li>
                </ul>
              </div>

              {exportStatus === "exporting" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Exporting products...</span>
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
                Export Products
              </Button>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Import Mode
                </label>
                <Select value={importMode} onValueChange={setImportMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upsert">
                      Upsert (Create new / Update existing)
                    </SelectItem>
                    <SelectItem value="create">
                      Create only (Skip existing products)
                    </SelectItem>
                    <SelectItem value="update">
                      Update only (Skip new products)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-gray-600">
                  {importMode === "upsert" &&
                    "Creates new products or updates existing ones by slug"}
                  {importMode === "create" &&
                    "Only creates new products, skips if product slug already exists"}
                  {importMode === "update" &&
                    "Only updates existing products, skips if product slug doesn't exist"}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Import File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Choose a CSV file to import products
                  </p>
                  <input
                    type="file"
                    accept=".csv"
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
                    Choose CSV File
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Template includes:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Product rows and variant rows
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Pricing and inventory data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Category and attribute mapping
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/data/products-template.csv"
                  download
                  className="text-sm text-blue-700 hover:underline"
                >
                  Download CSV template
                </a>
              </div>

              {importStatus === "importing" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing products...</span>
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
                      <span>Created:</span>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        {importResults.createdProducts}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Updated:</span>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        {importResults.updatedProducts}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Variants:</span>
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700"
                      >
                        +{importResults.createdVariants}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700"
                      >
                        {importResults.errors?.length || 0}
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
                    <span>row_type (product/variant)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>product_slug (unique)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>name (product name)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>status (published/draft)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>currency (USD, EUR, etc.)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>regular_price (decimal)</span>
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
                    <span>description (product description)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>category_id (UUID)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>stock (inventory count)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>sale_price (sale pricing)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>variant_attributes (size=M|color=red)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>product_images (media IDs)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Import Modes:</strong>
                  <br />• <strong>Upsert:</strong> Creates new products or
                  updates existing ones (recommended)
                  <br />• <strong>Create:</strong> Only creates new products,
                  skips existing slugs
                  <br />• <strong>Update:</strong> Only updates existing
                  products, skips new slugs
                  <br />
                  <br />
                  Products are identified by slug, variants by SKU. Image IDs
                  should reference existing media in your library.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

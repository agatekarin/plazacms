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
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Archive,
  Tag,
  Layers,
  CheckCircle,
  Calendar,
  RefreshCw,
  Star,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import toast from "react-hot-toast";

interface ProductAnalytics {
  summary: {
    total_products: number;
    published_products: number;
    draft_products: number;
    out_of_stock_products: number;
    average_price: number;
    max_price: number;
    min_price: number;
    total_stock: number;
    on_sale_products: number;
  };
  rates: {
    published_rate: number;
    draft_rate: number;
    out_of_stock_rate: number;
    on_sale_rate: number;
  };
  distributions: {
    status: {
      published: number;
      draft: number;
      out_of_stock: number;
    };
    category: Array<{
      category_name: string;
      product_count: number;
      average_price: number;
      total_stock: number;
    }>;
    price_range: Array<{
      price_range: string;
      product_count: number;
    }>;
    inventory: Array<{
      stock_status: string;
      product_count: number;
      total_stock: number;
    }>;
  };
  trends: {
    monthly: Array<{
      month: string;
      products_count: number;
      published_count: number;
      draft_count: number;
      average_price: number;
    }>;
  };
  top_lists: {
    best_selling: Array<{
      id: string;
      product_name: string;
      slug: string;
      total_sold: number;
      total_revenue: number;
      order_count: number;
    }>;
    recent_products: Array<{
      id: string;
      product_name: string;
      slug: string;
      stock: number;
      regular_price: number;
      status: string;
    }>;
  };
}

export default function ProductAnalyticsPage() {
  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load analytics");
    },
  });

  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCallJson(
        `/api/admin/products/analytics?period=${period}`
      );
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [apiCallJson, period]);

  // Call fetchAnalytics on component mount and period change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Refresh data
  const handleRefresh = () => {
    fetchAnalytics();
    toast.success("Analytics refreshed");
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

  if (!analytics) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Analytics
            </h1>
            <p className="text-gray-600">
              Comprehensive product performance insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Products
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.summary.total_products.toLocaleString()}
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
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-green-700">
                    {analytics.summary.published_products.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">
                    {analytics.rates.published_rate.toFixed(1)}% of total
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
                    Average Price
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    ${Number(analytics.summary.average_price || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${Number(analytics.summary.min_price || 0).toFixed(2)} - $
                    {Number(analytics.summary.max_price || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Inventory
                  </p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {analytics.summary.total_stock.toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600">
                    {analytics.summary.out_of_stock_products} out of stock
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Draft Products
                  </p>
                  <p className="text-2xl font-bold text-orange-700">
                    {analytics.summary.draft_products.toLocaleString()}
                  </p>
                  <p className="text-xs text-orange-600">
                    {analytics.rates.draft_rate.toFixed(1)}% of total
                  </p>
                </div>
                <Archive className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">On Sale</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {analytics.summary.on_sale_products.toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-600">
                    {analytics.rates.on_sale_rate.toFixed(1)}% of total
                  </p>
                </div>
                <Tag className="w-8 h-8 text-purple-600" />
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
                    {analytics.summary.out_of_stock_products.toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600">
                    {analytics.rates.out_of_stock_rate.toFixed(1)}% of total
                  </p>
                </div>
                <Archive className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monthly Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.trends.monthly.length > 0 ? (
                <div className="space-y-3">
                  {analytics.trends.monthly.slice(-6).map((trend) => (
                    <div
                      key={trend.month}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {trend.month}
                        </p>
                        <p className="text-sm text-gray-500">
                          {trend.published_count} published, {trend.draft_count}{" "}
                          draft
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">
                          +{trend.products_count}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${Number(trend.average_price || 0).toFixed(2)} avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No trend data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Top Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.distributions.category.length > 0 ? (
                <div className="space-y-3">
                  {analytics.distributions.category
                    .slice(0, 8)
                    .map((cat, index) => (
                      <div
                        key={cat.category_name}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {cat.category_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ${Number(cat.average_price || 0).toFixed(2)} avg •{" "}
                              {cat.total_stock} stock
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          {cat.product_count} products
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No category data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Price and Inventory Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Range Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Price Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.distributions.price_range.length > 0 ? (
                <div className="space-y-3">
                  {analytics.distributions.price_range.map((range) => (
                    <div
                      key={range.price_range}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg"
                    >
                      <p className="font-medium text-gray-900">
                        {range.price_range}
                      </p>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700"
                      >
                        {range.product_count} products
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No price data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Inventory Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.distributions.inventory.length > 0 ? (
                <div className="space-y-3">
                  {analytics.distributions.inventory.map((inv) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case "Out of Stock":
                          return "bg-red-50 text-red-700";
                        case "Low Stock":
                          return "bg-yellow-50 text-yellow-700";
                        case "Medium Stock":
                          return "bg-blue-50 text-blue-700";
                        case "High Stock":
                          return "bg-green-50 text-green-700";
                        default:
                          return "bg-gray-50 text-gray-700";
                      }
                    };

                    return (
                      <div
                        key={inv.stock_status}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {inv.stock_status}
                          </p>
                          <p className="text-xs text-gray-500">
                            {inv.total_stock.toLocaleString()} total units
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={getStatusColor(inv.stock_status)}
                        >
                          {inv.product_count} products
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No inventory data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5" />
                Best Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.top_lists.best_selling.length > 0 ? (
                <div className="space-y-3">
                  {analytics.top_lists.best_selling
                    .slice(0, 8)
                    .map((product, index) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">
                              {product.product_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {product.order_count} orders
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-700">
                            {product.total_sold} sold
                          </p>
                          <p className="text-xs text-gray-500">
                            ${Number(product.total_revenue || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No sales data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.top_lists.recent_products.length > 0 ? (
                <div className="space-y-3">
                  {analytics.top_lists.recent_products
                    .slice(0, 8)
                    .map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {product.product_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock: {product.stock} • $
                            {Number(product.regular_price || 0).toFixed(2)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            product.status === "published"
                              ? "bg-green-50 text-green-700"
                              : "bg-orange-50 text-orange-700"
                          }
                        >
                          {product.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No recent products available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

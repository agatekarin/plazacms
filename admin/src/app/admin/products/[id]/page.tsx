"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthenticatedFetch } from "@/lib/useAuthenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  ArrowLeft,
  Edit,
  Eye,
  Package,
  DollarSign,
  Star,
  MessageSquare,
  Calendar,
  User,
  Tag,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import PageContainer from "@/components/PageContainer";
import toast from "react-hot-toast";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  sku?: string;
  regular_price: number;
  sale_price?: number;
  currency: string;
  stock: number;
  status: "draft" | "published" | "archived";
  featured_image_url?: string;
  gallery_images: Array<{
    id: string;
    url: string;
    alt_text?: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
  }>;
  attributes: Array<{
    id: string;
    name: string;
    value: string;
  }>;
  variants: Array<{
    id: string;
    sku?: string;
    price: number;
    stock: number;
    status?: string;
  }>;
  review_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const { apiCallJson } = useAuthenticatedFetch({
    onError: (url, error) => {
      console.error(`API Error on ${url}:`, error);
      toast.error(error?.message || "Failed to load product");
    },
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await apiCallJson(`/api/admin/products/${productId}`);
        setProduct(data.item);
      } catch (error) {
        console.error("Error fetching product:", error);
        router.push("/admin/products");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, apiCallJson, router]);

  const getStatusBadge = (
    status: string
  ): "success" | "warning" | "secondary" => {
    const variants: Record<string, "success" | "warning" | "secondary"> = {
      published: "success",
      draft: "warning",
      archived: "secondary",
    };
    return variants[status] || "secondary";
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
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

  if (!product) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500">Product not found</p>
          <Button
            onClick={() => router.push("/admin/products")}
            className="mt-4"
          >
            Back to Products
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/products")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {product.name}
              </h1>
              <p className="text-gray-600">Product Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Product
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/admin/reviews/product/${product.id}`)
              }
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              View Reviews
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Product Name
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">
                      {product.sku || "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <div className="mt-1">
                      <Badge variant={getStatusBadge(product.status)}>
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Stock
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {product.stock} units
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Slug
                  </label>
                  <p className="text-sm text-gray-600 mt-1 font-mono">
                    {product.slug}
                  </p>
                </div>

                {product.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <div
                      className="text-sm text-gray-900 mt-1 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Regular Price
                    </label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {formatCurrency(product.regular_price, product.currency)}
                    </p>
                  </div>
                  {product.sale_price && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Sale Price
                      </label>
                      <p className="text-lg font-semibold text-green-600 mt-1">
                        {formatCurrency(product.sale_price, product.currency)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categories & Attributes */}
            {((product.categories?.length || 0) > 0 ||
              (product.attributes?.length || 0) > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Categories & Attributes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(product.categories?.length || 0) > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Categories
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {product.categories?.map((category) => (
                          <Badge key={category.id} variant="outline">
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(product.attributes?.length || 0) > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Attributes
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {product.attributes?.map((attribute) => (
                          <div key={attribute.id} className="text-sm">
                            <span className="font-medium text-gray-700">
                              {attribute.name}:
                            </span>
                            <span className="text-gray-900 ml-1">
                              {attribute.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Variants */}
            {(product.variants?.length || 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Product Variants ({product.variants?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {product.variants?.map((variant) => (
                      <div key={variant.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {variant.sku || `Variant ${variant.id.slice(-6)}`}
                            </p>
                            {variant.sku && (
                              <p className="text-sm text-gray-600 font-mono">
                                {variant.sku}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(variant.price, product.currency)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Stock: {variant.stock}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Images & Stats */}
          <div className="space-y-6">
            {/* Featured Image */}
            {product.featured_image_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Featured Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <OptimizedImage
                      src={product.featured_image_url}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery Images */}
            {(product.gallery_images?.length || 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Gallery ({product.gallery_images?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {product.gallery_images?.map((image, index) => (
                      <div
                        key={image.id}
                        className="aspect-square rounded-lg overflow-hidden border"
                      >
                        <OptimizedImage
                          src={image.url}
                          alt={image.alt_text || `${product.name} ${index + 1}`}
                          width={150}
                          height={150}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Review Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Total Reviews
                  </span>
                  <span className="text-sm text-gray-900">
                    {product.review_count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Average Rating
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-900">
                      {product.average_rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    router.push(`/admin/reviews/product/${product.id}`)
                  }
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View All Reviews
                </Button>
              </CardContent>
            </Card>

            {/* Meta Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Meta Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Product ID
                  </label>
                  <p className="text-sm text-gray-600 font-mono mt-1">
                    {product.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Created
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(product.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(product.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

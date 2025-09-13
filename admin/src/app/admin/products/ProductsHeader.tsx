"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProductsHeader() {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your product catalog</p>
      </div>
      <Button 
        onClick={() => router.push('/admin/products/add')} 
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Product
      </Button>
    </div>
  );
}

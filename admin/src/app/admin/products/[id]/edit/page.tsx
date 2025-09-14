"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, User } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function PagePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "admin") {
          router.push("/signin");
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Page Under Migration</h1>
      <p className="text-gray-600">
        This page is being migrated to use the new Hono backend API.
        Please check back later or contact the administrator.
      </p>
    </div>
  );
}

/*
ORIGINAL CODE COMMENTED OUT:
import { Session } from "next-auth";
import { Product } from "../../ProductEditor";
import { auth } from "../../../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../../../lib/db";
import ProductEditor from "../../ProductEditor";
import { getActiveTaxClasses } from "../../../../../lib/tax-classes";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const sp = await searchParams;
  const initialTab = (typeof sp?.tab === "string" ? sp.tab : undefined) as any;

  const { id } = await params;
  if (!id) redirect("/admin/products");

  const [productRes, categoriesRes, activeTaxClasses] = await Promise.all([
    pool.query(
      `SELECT p.id, p.name, p.slug, p.description, p.regular_price, p.currency, p.stock, p.category_id, p.status, p.sku, (p.weight::int) AS weight, p.sale_price, p.sale_start_date, p.sale_end_date, p.tax_class_id, p.featured_image_id,
              CASE 
                WHEN COUNT(pv.id) > 0 THEN 'variable'
                ELSE 'simple'
              END as product_type
         FROM public.products p
         LEFT JOIN public.product_variants pv ON pv.product_id = p.id
         WHERE p.id = $1
         GROUP BY p.id, p.name, p.slug, p.description, p.regular_price, p.currency, p.stock, p.category_id, p.status, p.sku, p.weight, p.sale_price, p.sale_start_date, p.sale_end_date, p.tax_class_id, p.featured_image_id`,
      [id]
    ),
    pool.query(`SELECT id, name FROM public.categories ORDER BY name ASC`),
    getActiveTaxClasses(200),
  ]);

  const product = productRes.rows?.[0];
  if (!product) redirect("/admin/products");

  const categories = categoriesRes.rows as { id: string; name: string }[];
  const taxClasses = activeTaxClasses as {
    id: string;
    name: string;
    rate: string;
  }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Product</h1>
      </div>
      <ProductEditor
        mode="edit"
        categories={categories}
        taxClasses={taxClasses}
        initialProduct={product}
        initialTab={initialTab}
      />
    </div>
  );
}

*/

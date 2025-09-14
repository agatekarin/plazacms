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
import { Category } from "./CategoriesManager"; // Category is now exported from CategoriesManager
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../lib/db";
import CategoriesManager from "./CategoriesManager";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const { rows } = await pool.query(`
    SELECT c.id, c.name, c.slug, c.description, c.image_id, c.created_at,
           m.file_url as image_url, m.alt_text as image_alt
    FROM public.categories c
    LEFT JOIN public.media m ON c.image_id = m.id
    ORDER BY c.created_at DESC
  `);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-sm text-gray-600 mt-1">
              Organize your products into categories
            </p>
          </div>
        </div>
      </div>

      {/* Categories Manager */}
      <CategoriesManager initialItems={rows as Category[]} />
    </div>
  );
}

*/

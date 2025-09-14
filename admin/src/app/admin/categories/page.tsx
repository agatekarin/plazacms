import { Session } from "../../../lib/auth/types";
import { Category } from "./CategoriesManager"; // Category is now exported from CategoriesManager
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { pool } from "../../../lib/db";
import CategoriesManager from "./CategoriesManager";
import { Button } from "@/components/ui/button";
import { Plus, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const session = await auth(sessionToken);
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  // if (!session?.user || role !== "admin") redirect("/signin");

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

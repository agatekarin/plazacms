import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../lib/db";
import CategoriesManager from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const { rows } = await pool.query(`SELECT id, name, slug, created_at FROM public.categories ORDER BY created_at DESC`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
      </div>
      <CategoriesManager initialItems={rows as any[]} />
    </div>
  );
}

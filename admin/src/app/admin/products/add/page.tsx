import { Session } from "next-auth";
import { auth } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../../lib/db";
import ProductEditor from "../ProductEditor";
import { getActiveTaxClasses } from "../../../../lib/tax-classes";

export const dynamic = "force-dynamic";

export default async function AddProductPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  let categories: { id: string; name: string }[] = [];
  let taxClasses: { id: string; name: string; rate: string }[] = [];
  try {
    const [categoriesRes, activeTaxClasses] = await Promise.all([
      pool.query(`SELECT id, name FROM public.categories ORDER BY name ASC`),
      getActiveTaxClasses(200),
    ]);
    categories = categoriesRes.rows as { id: string; name: string }[];
    taxClasses = activeTaxClasses as {
      id: string;
      name: string;
      rate: string;
    }[];
  } catch (e) {
    // Fallback to empty lists if DB is unavailable during local dev
    categories = [];
    taxClasses = [];
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add Product</h1>
      </div>
      <ProductEditor
        mode="create"
        categories={categories}
        taxClasses={taxClasses}
      />
    </div>
  );
}

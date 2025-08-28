import { auth } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../../lib/db";
import ProductEditor from "../ProductEditor";

export const dynamic = "force-dynamic";

export default async function AddProductPage() {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const [categoriesRes, taxClassesRes] = await Promise.all([
    pool.query(`SELECT id, name FROM public.categories ORDER BY name ASC`),
    pool.query(`SELECT id, name, rate FROM public.tax_classes ORDER BY name ASC`),
  ]);

  const categories = categoriesRes.rows as { id: string; name: string }[];
  const taxClasses = taxClassesRes.rows as { id: string; name: string; rate: string }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add Product</h1>
      </div>
      <ProductEditor mode="create" categories={categories} taxClasses={taxClasses} />
    </div>
  );
}

import { auth } from "../../../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../../../lib/db";
import ProductEditor from "../../ProductEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const id = params.id;
  if (!id) redirect("/admin/products");

  const [productRes, categoriesRes, taxClassesRes] = await Promise.all([
    pool.query(
      `SELECT id, name, slug, description, regular_price, currency, stock, category_id, status, sku, weight, sale_price, sale_start_date, sale_end_date, tax_class_id
         FROM public.products WHERE id = $1`,
      [id]
    ),
    pool.query(`SELECT id, name FROM public.categories ORDER BY name ASC`),
    pool.query(`SELECT id, name, rate FROM public.tax_classes ORDER BY name ASC`),
  ]);

  const product = productRes.rows?.[0];
  if (!product) redirect("/admin/products");

  const categories = categoriesRes.rows as { id: string; name: string }[];
  const taxClasses = taxClassesRes.rows as { id: string; name: string; rate: string }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Product</h1>
      </div>
      <ProductEditor mode="edit" categories={categories} taxClasses={taxClasses} initialProduct={product} />
    </div>
  );
}

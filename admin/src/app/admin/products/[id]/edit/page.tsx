import { Session } from "../../../../../lib/auth/types";
import { Product } from "../../ProductEditor";
import { auth } from "../../../../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const session = await auth(sessionToken);
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

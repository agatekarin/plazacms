import { auth } from "../../../lib/auth";
import { Session } from "../../../lib/auth/types";
import { redirect } from "next/navigation";
import { pool } from "../../../lib/db";
import ProductsToolbar from "./ProductsToolbar";
import ProductsHeader from "./ProductsHeader";
import ProductsTable from "./ProductsTable";
import { getActiveTaxClasses } from "../../../lib/tax-classes";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  stock: number;
  regular_price: number;
  currency: string;
  created_at: string;
  category_id: string | null;
  tax_class_id: string | null;
  category_name: string | undefined;
  featured_image_id: string | null;
  featured_image_url: string | undefined;
  featured_image_filename: string | undefined;
}

interface CategoryRow {
  id: string;
  name: string;
}

interface TaxClassRow {
  id: string;
  name: string;
  rate: string;
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q : "";
  const filter = typeof sp?.filter === "string" ? sp.filter : "all";
  const sort = typeof sp?.sort === "string" ? sp.sort : "created_desc";
  const page = Math.max(1, parseInt((sp?.page as string) || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt((sp?.pageSize as string) || "20", 10))
  );
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    params.push(`%${q}%`);
    params.push(`%${q}%`);
    where.push(
      `(p.name ILIKE $${params.length - 1} OR p.slug ILIKE $${params.length})`
    );
  }
  if (filter === "on_sale") {
    where.push(
      "p.sale_price IS NOT NULL AND (p.sale_start_date IS NULL OR p.sale_start_date <= NOW()) AND (p.sale_end_date IS NULL OR p.sale_end_date >= NOW())"
    );
  } else if (filter === "out_of_stock") {
    where.push("p.stock <= 0");
  } else if (filter.startsWith("status:")) {
    const val = filter.split(":")[1];
    params.push(val);
    where.push(`p.status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Build ORDER BY clause
  let orderBy = "p.created_at DESC"; // default
  switch (sort) {
    case "created_asc":
      orderBy = "p.created_at ASC";
      break;
    case "created_desc":
      orderBy = "p.created_at DESC";
      break;
    case "name_asc":
      orderBy = "p.name ASC";
      break;
    case "name_desc":
      orderBy = "p.name DESC";
      break;
    case "price_asc":
      orderBy = "p.regular_price ASC";
      break;
    case "price_desc":
      orderBy = "p.regular_price DESC";
      break;
    case "stock_asc":
      orderBy = "p.stock ASC";
      break;
    case "stock_desc":
      orderBy = "p.stock DESC";
      break;
  }

  const [countRes, productsRes, categoriesRes, activeTaxClasses] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM public.products p ${whereSql}`,
        params
      ),
      pool.query(
        `SELECT p.id, p.name, p.slug, p.sku, p.status, p.stock, p.regular_price, p.currency, p.created_at, p.category_id, p.tax_class_id,
              c.name AS category_name, p.featured_image_id,
              m.file_url AS featured_image_url, m.filename AS featured_image_filename
         FROM public.products p
         LEFT JOIN public.categories c ON c.id = p.category_id
         LEFT JOIN public.media m ON m.id = p.featured_image_id
         ${whereSql}
         ORDER BY ${orderBy}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      ),
      pool.query(
        "SELECT id, name FROM public.categories ORDER BY name ASC LIMIT 200"
      ),
      getActiveTaxClasses(200),
    ]);
  const rows = productsRes.rows as ProductRow[];
  const total = countRes.rows[0]?.count ?? 0;
  const categories = categoriesRes.rows as CategoryRow[];
  const taxClasses = activeTaxClasses as TaxClassRow[];

  return (
    <div className="space-y-6">
      <ProductsHeader />

      <ProductsToolbar total={total} />

      <ProductsTable
        products={rows}
        categories={categories}
        taxClasses={taxClasses}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {Math.min((page - 1) * pageSize + 1, total)} to{" "}
          {Math.min(page * pageSize, total)} of {total} results
        </div>
        <div className="flex items-center space-x-2">
          {page > 1 && (
            <a
              href={`?page=${page - 1}`}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous
            </a>
          )}
          {Array.from(
            { length: Math.min(5, Math.ceil(total / pageSize)) },
            (_, i) => {
              const pageNum = Math.max(1, page - 2) + i;
              if (pageNum > Math.ceil(total / pageSize)) return null;
              return (
                <a
                  key={pageNum}
                  href={`?page=${pageNum}`}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    pageNum === page
                      ? "text-blue-600 bg-blue-50 border border-blue-300"
                      : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </a>
              );
            }
          )}
          {page < Math.ceil(total / pageSize) && (
            <a
              href={`?page=${page + 1}`}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../lib/db";
import ProductActions from "./ProductActions";
import ProductsToolbar from "./ProductsToolbar";
import ProductsHeader from "./ProductsHeader";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const q = typeof searchParams?.q === "string" ? searchParams!.q : "";
  const filter = typeof searchParams?.filter === "string" ? searchParams!.filter : "all";
  const page = Math.max(1, parseInt((searchParams?.page as string) || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt((searchParams?.pageSize as string) || "20", 10)));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: any[] = [];
  if (q) {
    params.push(`%${q}%`);
    params.push(`%${q}%`);
    where.push(`(p.name ILIKE $${params.length - 1} OR p.slug ILIKE $${params.length})`);
  }
  if (filter === "on_sale") {
    where.push("p.sale_price IS NOT NULL AND (p.sale_start_date IS NULL OR p.sale_start_date <= NOW()) AND (p.sale_end_date IS NULL OR p.sale_end_date >= NOW())");
  } else if (filter === "out_of_stock") {
    where.push("p.stock <= 0");
  } else if (filter.startsWith("status:")) {
    const val = filter.split(":")[1];
    params.push(val);
    where.push(`p.status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRes, productsRes, categoriesRes, taxClassesRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM public.products p ${whereSql}`, params),
    pool.query(
      `SELECT p.id, p.name, p.slug, p.sku, p.status, p.stock, p.regular_price, p.currency, p.created_at, p.category_id, p.tax_class_id,
              c.name AS category_name
         FROM public.products p
         LEFT JOIN public.categories c ON c.id = p.category_id
         ${whereSql}
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    ),
    pool.query("SELECT id, name FROM public.categories ORDER BY name ASC LIMIT 200"),
    pool.query("SELECT id, name, rate FROM public.tax_classes ORDER BY name ASC LIMIT 200"),
  ]);
  const rows = productsRes.rows as any[];
  const total = countRes.rows[0]?.count ?? 0;
  const categories = categoriesRes.rows as any[];
  const taxClasses = taxClassesRes.rows as any[];

  return (
    <div className="space-y-6">
      <ProductsHeader categories={categories} taxClasses={taxClasses} />

      <ProductsToolbar total={total} />

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <Th>Name</Th>
              <Th>SKU</Th>
              <Th>Status</Th>
              <Th>Stock</Th>
              <Th>Price</Th>
              <Th>Category</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p: any) => (
              <tr key={p.id} className="border-t border-gray-200">
                <Td>
                  <div className="grid">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.slug}</span>
                  </div>
                </Td>
                <Td>{p.sku || "-"}</Td>
                <Td>{p.status}</Td>
                <Td>{p.stock}</Td>
                <Td>
                  {p.currency} {Number(p.regular_price).toFixed(2)}
                </Td>
                <Td>{p.category_name || "-"}</Td>
                <Td>{new Date(p.created_at).toLocaleString()}</Td>
                <Td>
                  <ProductActions product={p} categories={categories} taxClasses={taxClasses} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}

function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const prev = page > 1 ? page - 1 : 1;
  const next = page < last ? page + 1 : last;
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-2 text-sm">
      <a href={`?page=${prev}&pageSize=${pageSize}`} className="rounded-md px-3 py-2 hover:bg-gray-100">Previous</a>
      <div className="text-gray-600">Page {page} / {last} • {total} items</div>
      <a href={`?page=${next}&pageSize=${pageSize}`} className="rounded-md px-3 py-2 hover:bg-gray-100">Next</a>
    </div>
  );
}

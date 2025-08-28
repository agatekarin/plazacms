import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../lib/db";
import AttributesManager from "./AttributesManager";

export const dynamic = "force-dynamic";

export default async function AttributesPage() {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const [attrs, vals] = await Promise.all([
    pool.query("SELECT id, name FROM public.product_attributes ORDER BY name ASC"),
    pool.query("SELECT id, attribute_id, value FROM public.product_attribute_values ORDER BY value ASC"),
  ]);
  const map: Record<string, any[]> = {};
  for (const v of vals.rows as any[]) {
    (map[v.attribute_id] ||= []).push({ id: v.id, value: v.value });
  }

  const items = (attrs.rows as any[]).map((a) => ({ id: a.id, name: a.name, values: map[a.id] || [] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Attributes</h1>
      </div>
      <AttributesManager initialItems={items} />
    </div>
  );
}

import { Session } from "../../../lib/auth/types";

interface ProductAttribute {
  id: string;
  name: string;
}

interface ProductAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
}

interface AttributeItem {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}
import { auth } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { pool } from "../../../lib/db";
import AttributesManager from "./AttributesManager";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AttributesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("plaza_session")?.value;
  const session = await auth(sessionToken);
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  let items: AttributeItem[] = [];
  try {
    const [attrs, vals] = await Promise.all([
      pool.query(
        "SELECT id, name FROM public.product_attributes ORDER BY name ASC"
      ),
      pool.query(
        "SELECT id, attribute_id, value FROM public.product_attribute_values ORDER BY value ASC"
      ),
    ]);
    const map: Record<string, { id: string; value: string }[]> = {};
    for (const v of vals.rows as ProductAttributeValue[]) {
      (map[v.attribute_id] ||= []).push({ id: v.id, value: v.value });
    }
    items = (attrs.rows as any[]).map((a) => ({
      id: a.id,
      name: a.name,
      values: map[a.id] || [],
    }));
  } catch (e) {
    items = [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
            <Settings className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attributes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Define product attributes and their values
            </p>
          </div>
        </div>
      </div>

      {/* Attributes Manager */}
      <AttributesManager initialItems={items} />
    </div>
  );
}

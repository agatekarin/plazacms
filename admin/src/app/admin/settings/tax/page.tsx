import { Session } from "../../../../lib/auth/types";
import { auth } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { pool } from "../../../../lib/db";
import TaxClassesManager from "../tax-classes/TaxClassesManager";

export const dynamic = "force-dynamic";

interface TaxClassRow {
  id: string;
  name: string;
  rate: string; // numeric comes back as string from pg
  is_active: boolean;
}

export default async function TaxSettingsPage() {
  const session = await auth();
  const role = (session?.user as Session["user"] & { role?: string })?.role;
  if (!session?.user || role !== "admin") redirect("/signin");

  const { rows } = await pool.query<TaxClassRow>(
    "SELECT id, name, rate, is_active FROM public.tax_classes ORDER BY name ASC"
  );
  const items = rows as unknown as TaxClassRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tax Settings</h1>
      </div>
      <TaxClassesManager initialItems={items} />
    </div>
  );
}

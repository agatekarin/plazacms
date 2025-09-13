import { pool } from "./db";

export interface ActiveTaxClassRow {
  id: string;
  name: string;
  rate: string; // pg numeric as string
}

export async function getActiveTaxClasses(limit = 500): Promise<ActiveTaxClassRow[]> {
  const { rows } = await pool.query<ActiveTaxClassRow>(
    `SELECT id, name, rate FROM public.tax_classes WHERE is_active = true ORDER BY name ASC LIMIT $1`,
    [Math.max(1, Math.min(1000, limit))]
  );
  return rows as unknown as ActiveTaxClassRow[];
}

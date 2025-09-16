import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const bulk = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// DELETE /api/admin/products/bulk
bulk.delete("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = await c.req.json().catch(() => ({} as any));
  const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
  const validIds = ids.filter((id) => typeof id === "string" && id.length > 0);
  if (!validIds.length)
    return c.json({ error: "No valid product IDs provided" }, 400);

  // Delete and return deleted ids to count
  const rows = await sql`
    DELETE FROM public.products WHERE id = ANY(${validIds}::uuid[])
    RETURNING id
  `;
  return c.json({
    message: `Successfully deleted ${rows.length} products`,
    deletedCount: rows.length,
  });
});

export default bulk;

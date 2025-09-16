import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const categories = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/categories
categories.get("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const rows = await sql`
    SELECT c.id, c.name, c.slug, c.description, c.image_id, c.created_at,
           m.file_url as image_url, m.alt_text as image_alt
      FROM public.categories c
      LEFT JOIN public.media m ON c.image_id = m.id
      ORDER BY c.created_at DESC
  `;
  return c.json({ items: rows });
});

// POST /api/admin/categories
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  image_id: z.string().uuid().optional().nullable(),
});

categories.post("/", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);
  const b = parsed.data;

  try {
    const rows = await sql`
      INSERT INTO public.categories (name, slug, description, image_id)
      VALUES (${b.name}, ${b.slug}, ${b.description ?? null}, ${
      b.image_id ?? null
    })
      RETURNING id, name, slug, description, image_id, created_at
    `;
    return c.json({ ok: true, item: rows[0] }, 201);
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("categories_slug_key"))
      return c.json({ error: "Slug already exists" }, 409);
    return c.json({ error: "Failed to create category", detail: msg }, 500);
  }
});

// PATCH /api/admin/categories/:id
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  image_id: z.string().uuid().optional().nullable(),
});

categories.patch("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid payload" }, 400);
  const b = parsed.data;

  // Build update object for postgres.js
  const updates: Record<string, any> = {};
  if (b.name !== undefined) updates.name = b.name;
  if (b.slug !== undefined) updates.slug = b.slug;
  if (b.description !== undefined) updates.description = b.description;
  if (b.image_id !== undefined) updates.image_id = b.image_id;

  if (!Object.keys(updates).length) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.updated_at = new Date(); // Add timestamp

  try {
    const [updated] = await sql`
      UPDATE public.categories
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING id, name, slug, description, image_id, updated_at
    `;

    if (!updated) {
      return c.json({ error: "Category not found" }, 404);
    }

    return c.json({ ok: true, item: updated });
  } catch (e: any) {
    const msg = String(e?.message || e || "DB error");
    if (msg.includes("categories_slug_key"))
      return c.json({ error: "Slug already exists" }, 409);
    return c.json({ error: "Failed to update category", detail: msg }, 500);
  }
});

// DELETE /api/admin/categories/:id
categories.delete("/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const id = c.req.param("id");

  try {
    await sql`DELETE FROM public.categories WHERE id = ${id}`;
    return c.json({ ok: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return c.json({ error: "Failed to delete category" }, 500);
  }
});

export default categories;

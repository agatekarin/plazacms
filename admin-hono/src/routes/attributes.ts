import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const attributes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Apply admin middleware to all routes
attributes.use("*", adminMiddleware);

// Create attribute schema (with optional values like Next.js)
const createAttributeSchema = z.object({
  name: z.string().min(1).max(255),
  values: z.array(z.string()).optional(),
});

// Update attribute schema
const updateAttributeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// GET /api/admin/attributes (with values embedded like Next.js API)
attributes.get("/", async (c) => {
  try {
    const sql = getDb(c);

    // Get all attributes and their values
    const [attrs, vals] = await Promise.all([
      sql`SELECT id, name FROM public.product_attributes ORDER BY name ASC`,
      sql`SELECT id, attribute_id, value FROM public.product_attribute_values ORDER BY value ASC`,
    ]);

    // Group values by attribute_id
    const valuesByAttr: Record<string, { id: string; value: string }[]> = {};
    for (const v of vals as any[]) {
      if (!valuesByAttr[v.attribute_id]) valuesByAttr[v.attribute_id] = [];
      valuesByAttr[v.attribute_id].push({ id: v.id, value: v.value });
    }

    // Combine attributes with their values
    const items = (attrs as any[]).map((a) => ({
      id: a.id,
      name: a.name,
      values: valuesByAttr[a.id] || [],
    }));

    return c.json({ items }); // Match Next.js format
  } catch (error) {
    console.error("Get attributes error:", error);
    return c.json({ error: "Failed to fetch attributes" }, 500);
  }
});

// POST /api/admin/attributes (with optional values like Next.js)
attributes.post("/", zValidator("json", createAttributeSchema), async (c) => {
  try {
    const { name, values = [] } = c.req.valid("json");
    const sql = getDb(c);

    // Create attribute with transaction for values
    const [attr] = await sql`
      INSERT INTO public.product_attributes (name)
      VALUES (${name})
      RETURNING id, name, created_at, updated_at
    `;

    // Add values if provided
    if (Array.isArray(values) && values.length > 0) {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) {
          await sql`
            INSERT INTO public.product_attribute_values (attribute_id, value)
            VALUES (${attr.id}, ${value.trim()})
          `;
        }
      }
    }

    return c.json({ ok: true, item: attr }, 201); // Match Next.js format
  } catch (error) {
    console.error("Create attribute error:", error);
    return c.json({ error: "Failed to create attribute" }, 500);
  }
});

// GET /api/admin/attributes/:id
attributes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const sql = getDb(c);

    // Get attribute by ID using template literals
    const attributes = await sql`
      SELECT id, name, created_at, updated_at
      FROM public.product_attributes
      WHERE id = ${id}
      LIMIT 1
    `;

    if (attributes.length === 0) {
      return c.json({ success: false, error: "Attribute not found" }, 404);
    }

    return c.json({
      success: true,
      data: attributes[0],
    });
  } catch (error) {
    console.error("Get attribute error:", error);
    return c.json({ success: false, error: "Failed to fetch attribute" }, 500);
  }
});

// PATCH /api/admin/attributes/:id (match Next.js endpoint)
attributes.patch(
  "/:id",
  zValidator("json", updateAttributeSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { name } = c.req.valid("json");
      const sql = getDb(c);

      if (!name) {
        return c.json({ error: "name is required" }, 400);
      }

      const [updated] = await sql`
      UPDATE public.product_attributes
      SET name = ${name}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name
    `;

      if (!updated) {
        return c.json({ error: "Attribute not found" }, 404);
      }

      return c.json({ ok: true, item: updated }); // Match Next.js format
    } catch (error) {
      console.error("Update attribute error:", error);
      return c.json({ error: "Failed to update attribute" }, 500);
    }
  }
);

// DELETE /api/admin/attributes/:id
attributes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const sql = getDb(c);

    await sql`DELETE FROM public.product_attributes WHERE id = ${id}`;
    return c.json({ ok: true }); // Match Next.js format
  } catch (error) {
    console.error("Delete attribute error:", error);
    return c.json({ error: "Failed to delete attribute" }, 500);
  }
});

// POST /api/admin/attributes/:id/values (add value)
const createValueSchema = z.object({
  value: z.string().min(1),
});

attributes.post(
  "/:id/values",
  zValidator("json", createValueSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { value } = c.req.valid("json");
      const sql = getDb(c);

      const [newValue] = await sql`
      INSERT INTO public.product_attribute_values (attribute_id, value)
      VALUES (${id}, ${value.trim()})
      RETURNING id, attribute_id, value
    `;

      return c.json({ ok: true, item: newValue }, 201);
    } catch (error) {
      console.error("Create value error:", error);
      return c.json({ error: "Failed to create value" }, 500);
    }
  }
);

// PATCH /api/admin/attributes/:id/values/:valueId (update value)
const updateValueSchema = z.object({
  value: z.string().min(1),
});

attributes.patch(
  "/:id/values/:valueId",
  zValidator("json", updateValueSchema),
  async (c) => {
    try {
      const { id, valueId } = c.req.param();
      const { value } = c.req.valid("json");
      const sql = getDb(c);

      const [updated] = await sql`
      UPDATE public.product_attribute_values
      SET value = ${value.trim()}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${valueId} AND attribute_id = ${id}
      RETURNING id, attribute_id, value
    `;

      if (!updated) {
        return c.json({ error: "Value not found" }, 404);
      }

      return c.json({ ok: true, item: updated });
    } catch (error) {
      console.error("Update value error:", error);
      return c.json({ error: "Failed to update value" }, 500);
    }
  }
);

// DELETE /api/admin/attributes/:id/values/:valueId (delete value)
attributes.delete("/:id/values/:valueId", async (c) => {
  try {
    const { id, valueId } = c.req.param();
    const sql = getDb(c);

    await sql`
      DELETE FROM public.product_attribute_values
      WHERE id = ${valueId} AND attribute_id = ${id}
    `;

    return c.json({ ok: true });
  } catch (error) {
    console.error("Delete value error:", error);
    return c.json({ error: "Failed to delete value" }, 500);
  }
});

export default attributes;

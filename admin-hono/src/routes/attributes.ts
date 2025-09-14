import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const attributes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Apply admin middleware to all routes
attributes.use("*", adminMiddleware);

// Create attribute schema
const createAttributeSchema = z.object({
  name: z.string().min(1).max(255),
});

// Update attribute schema
const updateAttributeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// GET /api/admin/attributes
attributes.get("/", async (c) => {
  try {
    const sql = getDb(c);

    // Get all attributes using template literals
    const attributes = await sql`
      SELECT id, name, created_at, updated_at
      FROM public.product_attributes
      ORDER BY name ASC
    `;

    return c.json({
      success: true,
      data: attributes,
    });
  } catch (error) {
    console.error("Get attributes error:", error);
    return c.json({ success: false, error: "Failed to fetch attributes" }, 500);
  }
});

// POST /api/admin/attributes
attributes.post("/", zValidator("json", createAttributeSchema), async (c) => {
  try {
    const { name } = c.req.valid("json");
    const sql = getDb(c);

    // Create new attribute using template literals
    const newAttributes = await sql`
      INSERT INTO public.product_attributes (name)
      VALUES (${name})
      RETURNING id, name, created_at, updated_at
    `;

    return c.json(
      {
        success: true,
        data: newAttributes[0],
      },
      201
    );
  } catch (error) {
    console.error("Create attribute error:", error);
    return c.json({ success: false, error: "Failed to create attribute" }, 500);
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

// PUT /api/admin/attributes/:id
attributes.put("/:id", zValidator("json", updateAttributeSchema), async (c) => {
  try {
    const id = c.req.param("id");
    const updates = c.req.valid("json");
    const sql = getDb(c);

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push("name");
      values.push(updates.name);
    }

    if (updateFields.length === 0) {
      return c.json({ success: false, error: "No fields to update" }, 400);
    }

    // Update attribute using template literals
    const updatedAttributes = await sql`
      UPDATE public.product_attributes
      SET ${sql(
        Object.fromEntries(updateFields.map((field, i) => [field, values[i]]))
      )},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, name, created_at, updated_at
    `;

    if (updatedAttributes.length === 0) {
      return c.json({ success: false, error: "Attribute not found" }, 404);
    }

    return c.json({
      success: true,
      data: updatedAttributes[0],
    });
  } catch (error) {
    console.error("Update attribute error:", error);
    return c.json({ success: false, error: "Failed to update attribute" }, 500);
  }
});

// DELETE /api/admin/attributes/:id
attributes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const sql = getDb(c);

    // Delete attribute using template literals
    const deletedAttributes = await sql`
      DELETE FROM public.product_attributes
      WHERE id = ${id}
      RETURNING id, name
    `;

    if (deletedAttributes.length === 0) {
      return c.json({ success: false, error: "Attribute not found" }, 404);
    }

    return c.json({
      success: true,
      message: `Attribute "${deletedAttributes[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Delete attribute error:", error);
    return c.json({ success: false, error: "Failed to delete attribute" }, 500);
  }
});

export default attributes;

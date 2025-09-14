import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, getDb, DatabaseContext } from "../lib/db";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import {
  attributeSchema,
  attributeValueSchema,
  ProductAttribute,
  ProductAttributeValue,
  AttributeItem,
} from "../types";

const attributes = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
attributes.use("*", authMiddleware);
attributes.use("*", adminMiddleware);

// GET /attributes - List all attributes with their values
attributes.get("/", async (c) => {
  try {
    const sql = getDb(c as DatabaseContext);

    const [attrs, vals] = await Promise.all([
      sql`
        SELECT id, name
        FROM public.product_attributes
        ORDER BY name ASC
      `,
      sql`
        SELECT id, attribute_id, value
        FROM public.product_attribute_values
        ORDER BY value ASC
      `,
    ]);

    // Group values by attribute_id
    const valuesByAttr = vals.reduce(
      (acc: Record<string, { id: string; value: string }[]>, v) => {
        (acc[v.attribute_id] ||= []).push({ id: v.id, value: v.value });
        return acc;
      },
      {}
    );

    const items: AttributeItem[] = attrs.map((a) => ({
      id: a.id,
      name: a.name,
      values: valuesByAttr[a.id] || [],
    }));

    return c.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    console.error("Get attributes error:", error);
    return c.json({ error: "Failed to fetch attributes" }, 500);
  }
});

// POST /attributes - Create new attribute with optional values
attributes.post("/", zValidator("json", attributeSchema), async (c) => {
  try {
    const { name, values = [] } = c.req.valid("json");

    const sql = getDb(c as DatabaseContext);

    // Insert attribute
    const attrResult = await sql`
      INSERT INTO public.product_attributes (name)
      VALUES (${name})
      RETURNING id, name
    `;
    const attr = attrResult[0];

    // Insert values if provided
    if (values.length > 0) {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) {
          await sql`
            INSERT INTO public.product_attribute_values (attribute_id, value)
            VALUES (${attr.id}, ${value.trim()})
          `;
        }
      }
    }

    const result = attr;

    return c.json(
      {
        success: true,
        data: { item: result },
        message: "Attribute created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Create attribute error:", error);
    return c.json({ error: "Failed to create attribute" }, 500);
  }
});

// GET /attributes/:id - Get specific attribute with values
attributes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const [attrs, vals] = await Promise.all([
      db.select<ProductAttribute>(
        c as DatabaseContext,
        "public.product_attributes",
        "*",
        { id }
      ),
      db.select<ProductAttributeValue>(
        c as DatabaseContext,
        "public.product_attribute_values",
        "*",
        { attribute_id: id },
        "value ASC"
      ),
    ]);

    if (!attrs[0]) {
      return c.json({ error: "Attribute not found" }, 404);
    }

    const item: AttributeItem = {
      id: attrs[0].id,
      name: attrs[0].name,
      values: vals.map((v) => ({ id: v.id, value: v.value })),
    };

    return c.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    console.error("Get attribute error:", error);
    return c.json({ error: "Failed to fetch attribute" }, 500);
  }
});

// PUT /attributes/:id - Update attribute name
attributes.put(
  "/:id",
  zValidator("json", attributeSchema.pick({ name: true })),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { name } = c.req.valid("json");

      const result = await db.update<ProductAttribute>(
        c as DatabaseContext,
        "public.product_attributes",
        { name },
        { id },
        "id, name"
      );

      if (!result[0]) {
        return c.json({ error: "Attribute not found" }, 404);
      }

      return c.json({
        success: true,
        data: { item: result[0] },
        message: "Attribute updated successfully",
      });
    } catch (error) {
      console.error("Update attribute error:", error);
      return c.json({ error: "Failed to update attribute" }, 500);
    }
  }
);

// DELETE /attributes/:id - Delete attribute and all its values
attributes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const sql = getDb(c as DatabaseContext);

    // Delete all values first
    await sql`DELETE FROM public.product_attribute_values WHERE attribute_id = ${id}`;

    // Delete attribute
    const result =
      await sql`DELETE FROM public.product_attributes WHERE id = ${id} RETURNING id`;

    if (!result[0]) {
      throw new Error("Attribute not found");
    }

    return c.json({
      success: true,
      message: "Attribute deleted successfully",
    });
  } catch (error) {
    console.error("Delete attribute error:", error);
    if (error instanceof Error && error.message === "Attribute not found") {
      return c.json({ error: "Attribute not found" }, 404);
    }
    return c.json({ error: "Failed to delete attribute" }, 500);
  }
});

// POST /attributes/:id/values - Add value to attribute
attributes.post(
  "/:id/values",
  zValidator("json", attributeValueSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { value } = c.req.valid("json");

      // Check if attribute exists
      const attrs = await db.select<ProductAttribute>(
        c as DatabaseContext,
        "public.product_attributes",
        "id",
        { id }
      );

      if (!attrs[0]) {
        return c.json({ error: "Attribute not found" }, 404);
      }

      const result = await db.insert<ProductAttributeValue>(
        c as DatabaseContext,
        "public.product_attribute_values",
        { attribute_id: id, value },
        "id, attribute_id, value"
      );

      return c.json(
        {
          success: true,
          data: { item: result[0] },
          message: "Value added successfully",
        },
        201
      );
    } catch (error) {
      console.error("Add attribute value error:", error);
      return c.json({ error: "Failed to add value" }, 500);
    }
  }
);

// DELETE /attributes/:id/values/:valueId - Delete specific value
attributes.delete("/:id/values/:valueId", async (c) => {
  try {
    const id = c.req.param("id");
    const valueId = c.req.param("valueId");

    const result = await db.delete<ProductAttributeValue>(
      c as DatabaseContext,
      "public.product_attribute_values",
      { id: valueId, attribute_id: id },
      "id"
    );

    if (!result[0]) {
      return c.json({ error: "Value not found" }, 404);
    }

    return c.json({
      success: true,
      message: "Value deleted successfully",
    });
  } catch (error) {
    console.error("Delete attribute value error:", error);
    return c.json({ error: "Failed to delete value" }, 500);
  }
});

export default attributes;

import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const media = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/products/:id/media
media.get("/:id/media", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  if (!productId) return c.json({ error: "Missing id" }, 400);
  const rows = await sql`
    SELECT 
      pi.product_id,
      pi.media_id,
      pi.display_order,
      m.filename,
      m.file_url,
      m.file_type,
      m.size,
      m.alt_text,
      m.created_at
     FROM product_images pi
     JOIN media m ON m.id = pi.media_id
     WHERE pi.product_id = ${productId}
     ORDER BY pi.display_order ASC, pi.media_id ASC
  `;
  return c.json({ success: true, images: rows });
});

// POST /api/admin/products/:id/media
media.post("/:id/media", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  if (!productId) return c.json({ error: "Missing id" }, 400);
  const body = await c.req.json().catch(() => ({} as any));
  const media_id = body?.media_id as string | undefined;
  const display_order =
    typeof body?.display_order === "number"
      ? (body.display_order as number)
      : 999;
  const replace_featured = Boolean(body?.replace_featured);
  if (!media_id) return c.json({ error: "media_id is required" }, 400);

  if (replace_featured) {
    await sql`DELETE FROM product_images WHERE product_id = ${productId} AND display_order = 0`;
  }
  await sql`
    INSERT INTO product_images (product_id, media_id, display_order)
    VALUES (${productId}, ${media_id}, ${display_order})
    ON CONFLICT (product_id, media_id)
    DO UPDATE SET display_order = EXCLUDED.display_order
  `;
  await sql`
    UPDATE media SET entity_id = ${productId}, media_type = 'product_image'
    WHERE id = ${media_id}
  `;
  if (display_order === 0 || replace_featured) {
    await sql`UPDATE products SET featured_image_id = ${media_id} WHERE id = ${productId}`;
  }
  return c.json({
    success: true,
    message: "Image added to product successfully",
  });
});

// DELETE /api/admin/products/:id/media/:mediaId
media.delete("/:id/media/:mediaId", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  const mediaId = c.req.param("mediaId");
  if (!productId || !mediaId)
    return c.json({ error: "Missing id or mediaId" }, 400);

  const featured =
    await sql`SELECT featured_image_id FROM products WHERE id = ${productId}`;
  const isFeatured = (featured[0] as any)?.featured_image_id === mediaId;

  const del = await sql`
    DELETE FROM product_images
    WHERE product_id = ${productId} AND media_id = ${mediaId}
    RETURNING media_id
  `;
  if (!Array.isArray(del) || del.length === 0) {
    return c.json({ error: "Image not found in product" }, 404);
  }
  const other =
    await sql`SELECT COUNT(*)::int AS count FROM product_images WHERE media_id = ${mediaId}`;
  if ((other[0] as any)?.count === 0) {
    await sql`UPDATE media SET entity_id = NULL, media_type = 'other' WHERE id = ${mediaId}`;
  }
  if (isFeatured) {
    await sql`UPDATE products SET featured_image_id = NULL WHERE id = ${productId}`;
  }
  return c.json({
    success: true,
    message: "Image removed from product successfully",
  });
});

// PUT /api/admin/products/:id/media/reorder
media.put("/:id/media/reorder", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const productId = c.req.param("id");
  if (!productId) return c.json({ error: "Missing id" }, 400);
  const body = await c.req.json().catch(() => ({} as any));
  const media_id = body?.media_id as string | undefined;
  const display_order = body?.display_order as number | undefined;
  if (!media_id || display_order === undefined)
    return c.json({ error: "media_id and display_order are required" }, 400);

  if (display_order === 0) {
    await sql`
      UPDATE product_images SET display_order = 1
      WHERE product_id = ${productId} AND display_order = 0 AND media_id <> ${media_id}
    `;
  }
  await sql`
    UPDATE product_images SET display_order = ${display_order}
    WHERE product_id = ${productId} AND media_id = ${media_id}
  `;
  if (display_order === 0) {
    await sql`UPDATE products SET featured_image_id = ${media_id} WHERE id = ${productId}`;
  }
  return c.json({ success: true, message: "Image order updated successfully" });
});

export default media;

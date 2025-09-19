import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const reviewImagesRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// =====================================================
// REVIEW IMAGES API ROUTES
// =====================================================

// GET /api/admin/reviews/:reviewId/images - Get review images
reviewImagesRoutes.get("/:reviewId/images", adminMiddleware, async (c) => {
  try {
    const { reviewId } = c.req.param();

    const imagesQuery = `
      SELECT 
        ri.media_id,
        ri.display_order,
        m.filename,
        m.url,
        m.alt_text,
        m.file_size,
        m.mime_type,
        m.created_at
      FROM public.review_images ri
      LEFT JOIN public.media m ON ri.media_id = m.id
      WHERE ri.review_id = $1
      ORDER BY ri.display_order
    `;

    const sql = getDb(c);
    const images = await sql.unsafe(imagesQuery, [reviewId]);

    return c.json({ images });
  } catch (error) {
    console.error("Error fetching review images:", error);
    return c.json({ error: "Failed to fetch review images" }, 500);
  }
});

// POST /api/admin/reviews/:reviewId/images - Upload review images
reviewImagesRoutes.post("/:reviewId/images", adminMiddleware, async (c) => {
  try {
    const { reviewId } = c.req.param();
    const body = await c.req.json();
    const { media_ids } = body;

    if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
      return c.json({ error: "Media IDs array is required" }, 400);
    }

    const sql = getDb(c);

    // Verify review exists
    const reviewCheck = await sql.unsafe(
      "SELECT id FROM public.reviews WHERE id = $1",
      [reviewId]
    );

    if (reviewCheck.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    // Insert review images
    const insertPromises = media_ids.map((mediaId: string, index: number) => {
      return sql.unsafe(
        "INSERT INTO public.review_images (review_id, media_id, display_order) VALUES ($1, $2, $3) ON CONFLICT (review_id, media_id) DO NOTHING",
        [reviewId, mediaId, index + 1]
      );
    });

    await Promise.all(insertPromises);

    // Get updated images
    const imagesQuery = `
      SELECT 
        ri.media_id,
        ri.display_order,
        m.filename,
        m.url,
        m.alt_text
      FROM public.review_images ri
      LEFT JOIN public.media m ON ri.media_id = m.id
      WHERE ri.review_id = $1
      ORDER BY ri.display_order
    `;

    const images = await sql.unsafe(imagesQuery, [reviewId]);

    return c.json({
      message: "Images uploaded successfully",
      images,
    });
  } catch (error) {
    console.error("Error uploading review images:", error);
    return c.json({ error: "Failed to upload review images" }, 500);
  }
});

// DELETE /api/admin/reviews/:reviewId/images/:mediaId - Delete review image
reviewImagesRoutes.delete(
  "/:reviewId/images/:mediaId",
  adminMiddleware,
  async (c) => {
    try {
      const { reviewId, mediaId } = c.req.param();

      const deleteQuery = `
      DELETE FROM public.review_images 
      WHERE review_id = $1 AND media_id = $2
      RETURNING media_id
    `;

      const sql = getDb(c);
      const result = await sql.unsafe(deleteQuery, [reviewId, mediaId]);

      if (result.length === 0) {
        return c.json({ error: "Review image not found" }, 404);
      }

      return c.json({ message: "Review image deleted successfully" });
    } catch (error) {
      console.error("Error deleting review image:", error);
      return c.json({ error: "Failed to delete review image" }, 500);
    }
  }
);

// PATCH /api/admin/reviews/:reviewId/images/:mediaId - Update image display order
reviewImagesRoutes.patch(
  "/:reviewId/images/:mediaId",
  adminMiddleware,
  async (c) => {
    try {
      const { reviewId, mediaId } = c.req.param();
      const body = await c.req.json();
      const { display_order } = body;

      if (display_order === undefined || display_order < 0) {
        return c.json({ error: "Valid display order is required" }, 400);
      }

      const updateQuery = `
      UPDATE public.review_images 
      SET display_order = $3
      WHERE review_id = $1 AND media_id = $2
      RETURNING *
    `;

      const sql = getDb(c);
      const result = await sql.unsafe(updateQuery, [
        reviewId,
        mediaId,
        display_order,
      ]);

      if (result.length === 0) {
        return c.json({ error: "Review image not found" }, 404);
      }

      return c.json(result[0]);
    } catch (error) {
      console.error("Error updating review image:", error);
      return c.json({ error: "Failed to update review image" }, 500);
    }
  }
);

// POST /api/admin/reviews/:reviewId/images/reorder - Reorder review images
reviewImagesRoutes.post(
  "/:reviewId/images/reorder",
  adminMiddleware,
  async (c) => {
    try {
      const { reviewId } = c.req.param();
      const body = await c.req.json();
      const { media_ids } = body;

      if (!media_ids || !Array.isArray(media_ids)) {
        return c.json({ error: "Media IDs array is required" }, 400);
      }

      const sql = getDb(c);

      // Update display order for each image
      const updatePromises = media_ids.map((mediaId: string, index: number) => {
        return sql.unsafe(
          "UPDATE public.review_images SET display_order = $3 WHERE review_id = $1 AND media_id = $2",
          [reviewId, mediaId, index + 1]
        );
      });

      await Promise.all(updatePromises);

      // Get updated images
      const imagesQuery = `
      SELECT 
        ri.media_id,
        ri.display_order,
        m.filename,
        m.url,
        m.alt_text
      FROM public.review_images ri
      LEFT JOIN public.media m ON ri.media_id = m.id
      WHERE ri.review_id = $1
      ORDER BY ri.display_order
    `;

      const images = await sql.unsafe(imagesQuery, [reviewId]);

      return c.json({
        message: "Images reordered successfully",
        images,
      });
    } catch (error) {
      console.error("Error reordering review images:", error);
      return c.json({ error: "Failed to reorder review images" }, 500);
    }
  }
);

export default reviewImagesRoutes;

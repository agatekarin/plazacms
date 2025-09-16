import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const mediaBulk = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// PATCH /api/admin/media/bulk - Bulk update media metadata
mediaBulk.patch("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json();
    const { media_ids, updates } = body;

    if (!Array.isArray(media_ids) || media_ids.length === 0) {
      return c.json({ error: "media_ids array is required" }, 400);
    }

    if (!updates || typeof updates !== "object") {
      return c.json({ error: "updates object is required" }, 400);
    }

    // Validate allowed update fields
    const allowedFields = ["media_type", "folder_id", "alt_text"];
    const updateFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) {
        return c.json(
          { error: `Field '${key}' is not allowed for bulk update` },
          400
        );
      }
      updateFields[key] = value;
    }

    if (Object.keys(updateFields).length === 0) {
      return c.json({ error: "No valid update fields provided" }, 400);
    }

    // Validate media_type if provided
    if (updateFields.media_type) {
      const validTypes = [
        "product_image",
        "product_variant_image",
        "user_profile",
        "review_image",
        "site_asset",
        "other",
      ];
      if (!validTypes.includes(updateFields.media_type)) {
        return c.json({ error: "Invalid media type" }, 400);
      }
    }

    // Validate folder exists if provided
    if (updateFields.folder_id && updateFields.folder_id !== "") {
      const folderCheck = await sql`
        SELECT id FROM media_folders WHERE id = ${updateFields.folder_id}
      `;

      if (folderCheck.length === 0) {
        return c.json({ error: "Folder not found" }, 404);
      }
    }

    updateFields.updated_at = new Date();

    // Perform bulk update
    const result = await sql`
      UPDATE media 
      SET ${sql(updateFields)}
      WHERE id = ANY(${media_ids}::uuid[])
      RETURNING id, filename, media_type, folder_id, alt_text, updated_at
    `;

    return c.json({
      success: true,
      message: `Successfully updated ${result.length} media files`,
      updated_count: result.length,
      updated_media: result,
    });
  } catch (error: any) {
    console.error("Media bulk PATCH error:", error);
    return c.json({ error: "Failed to update media files" }, 500);
  }
});

// DELETE /api/admin/media/bulk - Bulk delete media files
mediaBulk.delete("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { searchParams } = new URL(c.req.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return c.json({ error: "ids parameter is required" }, 400);
    }

    const mediaIds = idsParam.split(",").filter((id) => id.trim().length > 0);

    if (mediaIds.length === 0) {
      return c.json({ error: "No valid media IDs provided" }, 400);
    }

    // Get media files info before deletion (for potential file cleanup)
    const mediaFiles = await sql`
      SELECT id, filename, file_url FROM media WHERE id = ANY(${mediaIds}::uuid[])
    `;

    // Delete from database
    const result = await sql`
      DELETE FROM media WHERE id = ANY(${mediaIds}::uuid[])
      RETURNING id, filename
    `;

    // TODO: Delete actual files from R2/S3 storage
    // for (const media of mediaFiles) {
    //   await deleteFileFromR2(media.file_url);
    // }

    return c.json({
      success: true,
      message: `Successfully deleted ${result.length} media files`,
      deleted_count: result.length,
      deleted_media: result,
    });
  } catch (error: any) {
    console.error("Media bulk DELETE error:", error);
    return c.json({ error: "Failed to delete media files" }, 500);
  }
});

// GET /api/admin/media/bulk - Get media stats or batch info
mediaBulk.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { searchParams } = new URL(c.req.url);
    const action = searchParams.get("action") || "stats";

    if (action === "stats") {
      // Get media statistics
      const stats = await sql`
        SELECT 
          COUNT(*) as total_files,
          COUNT(CASE WHEN media_type = 'image' THEN 1 END) as images,
          COUNT(CASE WHEN media_type = 'video' THEN 1 END) as videos,
          COUNT(CASE WHEN media_type = 'audio' THEN 1 END) as audio,
          COUNT(CASE WHEN media_type = 'document' THEN 1 END) as documents,
          COUNT(CASE WHEN media_type = 'other' THEN 1 END) as other,
          SUM(size) as total_size,
          AVG(size) as average_size
        FROM media
      `;

      const folderStats = await sql`
        SELECT COUNT(*) as total_folders FROM media_folders
      `;

      return c.json({
        success: true,
        stats: {
          ...stats[0],
          total_folders: folderStats[0].total_folders,
        },
      });
    }

    return c.json({ error: "Invalid action" }, 400);
  } catch (error: any) {
    console.error("Media bulk GET error:", error);
    return c.json({ error: "Failed to get media stats" }, 500);
  }
});

export default mediaBulk;

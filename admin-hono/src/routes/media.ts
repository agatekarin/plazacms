import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const media = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/media - List media with pagination and filters
media.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { searchParams } = new URL(c.req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "24", 10))
    );
    const folderId = searchParams.get("folder_id");
    const search = searchParams.get("search");
    const mediaType = searchParams.get("type");
    const view = searchParams.get("view") || "grid";
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: any[] = [];

    if (folderId) {
      conditions.push(sql`m.folder_id = ${folderId}`);
    } else if (folderId === null || searchParams.has("folder_id")) {
      conditions.push(sql`m.folder_id IS NULL`);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        sql`(m.filename ILIKE ${searchTerm} OR m.alt_text ILIKE ${searchTerm})`
      );
    }

    if (mediaType && mediaType !== "all") {
      conditions.push(sql`m.media_type = ${mediaType}`);
    }

    // Build WHERE clause
    let whereSql = sql``;
    if (conditions.length === 1) {
      whereSql = sql`WHERE ${conditions[0]}`;
    } else if (conditions.length === 2) {
      whereSql = sql`WHERE ${conditions[0]} AND ${conditions[1]}`;
    } else if (conditions.length === 3) {
      whereSql = sql`WHERE ${conditions[0]} AND ${conditions[1]} AND ${conditions[2]}`;
    } else if (conditions.length > 3) {
      whereSql = sql`WHERE ${conditions[0]}`;
      for (let i = 1; i < conditions.length; i++) {
        whereSql = sql`${whereSql} AND ${conditions[i]}`;
      }
    }

    // Main query with folder info
    const listQuery = sql`
      SELECT 
        m.id, m.filename, m.file_url, m.file_type, m.size, m.alt_text, 
        m.media_type, m.created_at, m.updated_at, m.folder_id,
        f.name as folder_name, f.path as folder_path,
        u.name as uploaded_by_name
      FROM media m
      LEFT JOIN media_folders f ON f.id = m.folder_id
      LEFT JOIN users u ON u.id = m.uploaded_by
      ${whereSql}
      ORDER BY m.created_at DESC 
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // Count query
    const countQuery = sql`
      SELECT COUNT(*) as count
      FROM media m
      LEFT JOIN media_folders f ON f.id = m.folder_id
      ${whereSql}
    `;

    const [countRes, listRes] = await Promise.all([countQuery, listQuery]);

    const total = parseInt((countRes as any)[0]?.count ?? 0);

    return c.json({
      success: true,
      items: listRes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filters: {
        folder_id: folderId,
        search,
        type: mediaType,
        view,
      },
    });
  } catch (error: any) {
    console.error("Media GET error:", error);
    return c.json({ error: "Failed to fetch media" }, 500);
  }
});

// GET /api/admin/media/:id - Get specific media details
media.get("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const id = c.req.param("id");

    const result = await sql`
      SELECT 
        m.id, m.filename, m.file_url, m.file_type, m.size, m.alt_text, 
        m.media_type, m.created_at, m.updated_at, m.folder_id,
        f.name as folder_name, f.path as folder_path,
        u.name as uploaded_by_name
      FROM media m
      LEFT JOIN media_folders f ON f.id = m.folder_id
      LEFT JOIN users u ON u.id = m.uploaded_by
      WHERE m.id = ${id}
    `;

    if (result.length === 0) {
      return c.json({ error: "Media not found" }, 404);
    }

    return c.json({
      success: true,
      media: result[0],
    });
  } catch (error: any) {
    console.error("Media GET error:", error);
    return c.json({ error: "Failed to fetch media" }, 500);
  }
});

// PATCH /api/admin/media/:id - Update media metadata
media.patch("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { alt_text, media_type, folder_id } = body;

    // Validate media type if provided
    if (media_type) {
      const validTypes = [
        "product_image",
        "product_variant_image",
        "user_profile",
        "review_image",
        "site_asset",
        "other",
      ];
      if (!validTypes.includes(media_type)) {
        return c.json({ error: "Invalid media type" }, 400);
      }
    }

    // Validate folder exists (if provided and not null)
    if (folder_id && folder_id !== "") {
      const folderCheck =
        await sql`SELECT id FROM media_folders WHERE id = ${folder_id}`;

      if (folderCheck.length === 0) {
        return c.json({ error: "Folder not found" }, 404);
      }
    }

    // Build update object
    const updates: Record<string, any> = {};

    if (alt_text !== undefined) {
      updates.alt_text = alt_text || null;
    }

    if (media_type !== undefined) {
      updates.media_type = media_type;
    }

    if (folder_id !== undefined) {
      updates.folder_id = folder_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.updated_at = new Date();

    const result = await sql`
      UPDATE media 
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING 
        id, filename, file_url, file_type, size, alt_text, 
        media_type, created_at, updated_at, folder_id
    `;

    if (result.length === 0) {
      return c.json({ error: "Media not found" }, 404);
    }

    return c.json({
      success: true,
      media: result[0],
    });
  } catch (error: any) {
    console.error("Media PATCH error:", error);
    return c.json({ error: "Failed to update media" }, 500);
  }
});

// DELETE /api/admin/media/:id - Delete media
media.delete("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const id = c.req.param("id");

    // Get media info first for file deletion
    const media = await sql`SELECT file_url FROM media WHERE id = ${id}`;

    if (media.length === 0) {
      return c.json({ error: "Media not found" }, 404);
    }

    // Delete from database
    await sql`DELETE FROM media WHERE id = ${id}`;

    // TODO: Delete file from R2 storage if needed
    // await deleteFileFromR2(media[0].file_url);

    return c.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error: any) {
    console.error("Media DELETE error:", error);
    return c.json({ error: "Failed to delete media" }, 500);
  }
});

export default media;

import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const mediaFolders = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/media/folders - List all folders (with optional hierarchy)
mediaFolders.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const { searchParams } = new URL(c.req.url);
    const includeChildren = searchParams.get("include_children") === "true";

    if (includeChildren) {
      // Get all folders in hierarchical structure WITH COUNTS
      const folders = await sql`
        WITH RECURSIVE folder_tree AS (
          SELECT id, name, parent_id, path, description, created_at, updated_at, 0 as level
          FROM media_folders 
          WHERE parent_id IS NULL
          
          UNION ALL
          
          SELECT f.id, f.name, f.parent_id, f.path, f.description, f.created_at, f.updated_at, ft.level + 1
          FROM media_folders f
          INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT 
          ft.id, ft.name, ft.parent_id, ft.path, ft.description, ft.created_at, ft.updated_at, ft.level,
          COALESCE(COUNT(m.id), 0) as media_count,
          COALESCE(COUNT(cf.id), 0) as children_count
        FROM folder_tree ft
        LEFT JOIN media m ON m.folder_id = ft.id
        LEFT JOIN media_folders cf ON cf.parent_id = ft.id
        GROUP BY ft.id, ft.name, ft.parent_id, ft.path, ft.description, ft.created_at, ft.updated_at, ft.level
        ORDER BY ft.path ASC
      `;

      return c.json({
        success: true,
        folders: folders,
        total: folders.length,
      });
    } else {
      // Get all folders flat WITH COUNTS
      const folders = await sql`
        SELECT 
          f.id, f.name, f.parent_id, f.path, f.description,
          f.created_at, f.updated_at,
          COALESCE(media_counts.media_count, 0) as media_count,
          COALESCE(children_counts.children_count, 0) as children_count
        FROM media_folders f
        LEFT JOIN (
          SELECT folder_id, COUNT(*) as media_count 
          FROM media 
          GROUP BY folder_id
        ) media_counts ON media_counts.folder_id = f.id
        LEFT JOIN (
          SELECT parent_id, COUNT(*) as children_count 
          FROM media_folders 
          GROUP BY parent_id
        ) children_counts ON children_counts.parent_id = f.id
        ORDER BY f.path ASC
      `;

      return c.json({
        success: true,
        folders: folders,
        total: folders.length,
      });
    }
  } catch (error: any) {
    console.error("Folders GET error:", error);
    return c.json({ error: "Failed to fetch folders" }, 500);
  }
});

// POST /api/admin/media/folders - Create new folder
mediaFolders.post("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json();
    const { name, parent_id, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return c.json({ error: "Folder name is required" }, 400);
    }

    // Validate parent folder exists (if provided)
    if (parent_id) {
      const parentCheck = await sql`
        SELECT id, path FROM media_folders WHERE id = ${parent_id}
      `;

      if (parentCheck.length === 0) {
        return c.json({ error: "Parent folder not found" }, 404);
      }
    }

    // Generate folder path
    const sanitizedName = name
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    let folderPath = sanitizedName;

    if (parent_id) {
      const parent =
        await sql`SELECT path FROM media_folders WHERE id = ${parent_id}`;
      folderPath = `${parent[0].path}/${sanitizedName}`;
    }

    // Check for duplicate paths
    const existingFolder = await sql`
      SELECT id FROM media_folders WHERE path = ${folderPath}
    `;

    if (existingFolder.length > 0) {
      return c.json({ error: "A folder with this path already exists" }, 409);
    }

    // Create folder
    const result = await sql`
      INSERT INTO media_folders (name, path, parent_id, description)
      VALUES (${name.trim()}, ${folderPath}, ${parent_id || null}, ${
      description?.trim() || null
    })
      RETURNING id, name, path, parent_id, description, created_at, updated_at
    `;

    return c.json({
      success: true,
      message: "Folder created successfully",
      folder: result[0],
    });
  } catch (error: any) {
    console.error("Folder POST error:", error);
    return c.json({ error: "Failed to create folder" }, 500);
  }
});

// GET /api/admin/media/folders/:id - Get specific folder
mediaFolders.get("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const id = c.req.param("id");

    const result = await sql`
      SELECT 
        f.id, f.name, f.path, f.parent_id, f.description, f.created_at, f.updated_at,
        pf.name as parent_name,
        COALESCE(COUNT(m.id), 0) as media_count,
        COALESCE(COUNT(cf.id), 0) as children_count
      FROM media_folders f
      LEFT JOIN media_folders pf ON pf.id = f.parent_id
      LEFT JOIN media m ON m.folder_id = f.id
      LEFT JOIN media_folders cf ON cf.parent_id = f.id
      WHERE f.id = ${id}
      GROUP BY f.id, f.name, f.path, f.parent_id, f.description, f.created_at, f.updated_at, pf.name
    `;

    if (result.length === 0) {
      return c.json({ error: "Folder not found" }, 404);
    }

    // Ensure counts are proper numbers, not strings
    const folder = {
      ...result[0],
      media_count: parseInt(result[0].media_count) || 0,
      children_count: parseInt(result[0].children_count) || 0,
    };

    return c.json({
      success: true,
      folder: folder,
    });
  } catch (error: any) {
    console.error("Folder GET error:", error);
    return c.json({ error: "Failed to fetch folder" }, 500);
  }
});

// PATCH /api/admin/media/folders/:id - Update folder
mediaFolders.patch("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, parent_id, description } = body;

    // Get current folder
    const current = await sql`
      SELECT id, name, path, parent_id, description FROM media_folders WHERE id = ${id}
    `;

    if (current.length === 0) {
      return c.json({ error: "Folder not found" }, 404);
    }

    const currentFolder = current[0];

    // Validate new parent (if changed)
    if (parent_id !== undefined && parent_id !== currentFolder.parent_id) {
      if (parent_id) {
        const parentCheck = await sql`
          SELECT id, path FROM media_folders WHERE id = ${parent_id}
        `;

        if (parentCheck.length === 0) {
          return c.json({ error: "Parent folder not found" }, 404);
        }

        // Check for circular reference
        if (parent_id === id) {
          return c.json({ error: "Cannot make folder its own parent" }, 400);
        }
      }
    }

    const updates: Record<string, any> = {};

    if (name !== undefined && name !== currentFolder.name) {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return c.json({ error: "Folder name is required" }, 400);
      }
      updates.name = name.trim();
    }

    if (parent_id !== undefined && parent_id !== currentFolder.parent_id) {
      updates.parent_id = parent_id || null;
    }

    if (
      description !== undefined &&
      description !== currentFolder.description
    ) {
      updates.description = description?.trim() || null;
    }

    // Regenerate path if name or parent changed
    if (updates.name || updates.parent_id !== undefined) {
      const newName = updates.name || currentFolder.name;
      const sanitizedName = newName
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

      let newPath = sanitizedName;
      const newParentId =
        updates.parent_id !== undefined
          ? updates.parent_id
          : currentFolder.parent_id;

      if (newParentId) {
        const parent =
          await sql`SELECT path FROM media_folders WHERE id = ${newParentId}`;
        newPath = `${parent[0].path}/${sanitizedName}`;
      }

      // Check for path conflicts
      const pathConflict = await sql`
        SELECT id FROM media_folders WHERE path = ${newPath} AND id != ${id}
      `;

      if (pathConflict.length > 0) {
        return c.json({ error: "A folder with this path already exists" }, 409);
      }

      updates.path = newPath;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.updated_at = new Date();

    const result = await sql`
      UPDATE media_folders 
      SET ${sql(updates)}
      WHERE id = ${id}
      RETURNING id, name, path, parent_id, description, created_at, updated_at
    `;

    // If path changed, update all child folder paths
    if (updates.path && updates.path !== currentFolder.path) {
      await sql`
        UPDATE media_folders 
        SET path = REPLACE(path, ${currentFolder.path}, ${updates.path}), 
            updated_at = CURRENT_TIMESTAMP
        WHERE path LIKE ${currentFolder.path + "/%"}
      `;
    }

    return c.json({
      success: true,
      message: "Folder updated successfully",
      folder: result[0],
    });
  } catch (error: any) {
    console.error("Folder PATCH error:", error);
    return c.json({ error: "Failed to update folder" }, 500);
  }
});

// DELETE /api/admin/media/folders/:id - Delete folder
mediaFolders.delete("/:id", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const id = c.req.param("id");

    // Check if folder has media or child folders
    const usage = await sql`
      SELECT 
        (SELECT COUNT(*) FROM media WHERE folder_id = ${id}) as media_count,
        (SELECT COUNT(*) FROM media_folders WHERE parent_id = ${id}) as child_count
    `;

    const { media_count, child_count } = usage[0];

    if (parseInt(media_count) > 0 || parseInt(child_count) > 0) {
      return c.json(
        {
          error: "Cannot delete folder that contains media files or subfolders",
        },
        400
      );
    }

    // Delete folder
    const result = await sql`
      DELETE FROM media_folders WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return c.json({ error: "Folder not found" }, 404);
    }

    return c.json({
      success: true,
      message: "Folder deleted successfully",
    });
  } catch (error: any) {
    console.error("Folder DELETE error:", error);
    return c.json({ error: "Failed to delete folder" }, 500);
  }
});

export default mediaFolders;

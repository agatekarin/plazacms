import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/admin/media/folders/[id] - Get specific folder details
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT 
         f.id, f.name, f.parent_id, f.path, f.description,
         f.created_at, f.updated_at,
         COALESCE(media_counts.media_count, 0) as media_count,
         COALESCE(children_counts.children_count, 0) as children_count,
         pf.name as parent_name
       FROM media_folders f
       LEFT JOIN (
         SELECT folder_id, COUNT(*) as media_count 
         FROM media 
         WHERE folder_id = $1
         GROUP BY folder_id
       ) media_counts ON media_counts.folder_id = f.id
       LEFT JOIN (
         SELECT parent_id, COUNT(*) as children_count 
         FROM media_folders 
         WHERE parent_id = $1
         GROUP BY parent_id
       ) children_counts ON children_counts.parent_id = f.id
       LEFT JOIN media_folders pf ON pf.id = f.parent_id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Ensure counts are proper numbers, not strings
    const folder = {
      ...result.rows[0],
      media_count: parseInt(result.rows[0].media_count) || 0,
      children_count: parseInt(result.rows[0].children_count) || 0
    };

    return NextResponse.json({
      success: true,
      folder: folder
    });

  } catch (error: any) {
    console.error("Folder GET error:", error);
    return NextResponse.json({ error: "Failed to fetch folder" }, { status: 500 });
  }
}

// PATCH /api/admin/media/folders/[id] - Update folder
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, parent_id, description } = body;

    // Get current folder details
    const currentResult = await pool.query(
      "SELECT * FROM media_folders WHERE id = $1",
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const currentFolder = currentResult.rows[0];
    let newPath = currentFolder.path;

    // If name or parent changed, recalculate path
    if (name && name !== currentFolder.name || parent_id !== currentFolder.parent_id) {
      const folderName = name || currentFolder.name;
      
      if (parent_id) {
        const parentResult = await pool.query(
          "SELECT path FROM media_folders WHERE id = $1",
          [parent_id]
        );
        
        if (parentResult.rows.length === 0) {
          return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
        }
        
        const parentPath = parentResult.rows[0].path;
        newPath = `${parentPath === '/' ? '' : parentPath}/${folderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      } else {
        newPath = `/${folderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      }

      // Check if new path conflicts with existing folder
      if (newPath !== currentFolder.path) {
        const existingResult = await pool.query(
          "SELECT id FROM media_folders WHERE path = $1 AND id != $2",
          [newPath, id]
        );

        if (existingResult.rows.length > 0) {
          return NextResponse.json({ error: "Folder with this name already exists" }, { status: 409 });
        }
      }
    }

    // Update folder
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name.trim());
    }
    
    if (parent_id !== undefined) {
      updateFields.push(`parent_id = $${paramIndex++}`);
      updateValues.push(parent_id || null);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description?.trim() || null);
    }

    if (newPath !== currentFolder.path) {
      updateFields.push(`path = $${paramIndex++}`);
      updateValues.push(newPath);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE media_folders SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    // If path changed, update all child folder paths
    if (newPath !== currentFolder.path) {
      await pool.query(
        `UPDATE media_folders 
         SET path = REPLACE(path, $1, $2), updated_at = CURRENT_TIMESTAMP
         WHERE path LIKE $3`,
        [currentFolder.path, newPath, `${currentFolder.path}/%`]
      );
    }

    return NextResponse.json({
      success: true,
      folder: result.rows[0]
    });

  } catch (error: any) {
    console.error("Folder update error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

// DELETE /api/admin/media/folders/[id] - Delete folder
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if folder has children
    const childrenResult = await pool.query(
      "SELECT COUNT(*) as count FROM media_folders WHERE parent_id = $1",
      [id]
    );

    const childrenCount = parseInt(childrenResult.rows[0].count);
    if (childrenCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete folder that contains subfolders. Delete or move subfolders first." 
      }, { status: 400 });
    }

    // Check if folder has media
    const mediaResult = await pool.query(
      "SELECT COUNT(*) as count FROM media WHERE folder_id = $1",
      [id]
    );

    const mediaCount = parseInt(mediaResult.rows[0].count);
    if (mediaCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete folder that contains ${mediaCount} media files. Move or delete media first.` 
      }, { status: 400 });
    }

    // Delete folder
    const result = await pool.query(
      "DELETE FROM media_folders WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Folder deleted successfully"
    });

  } catch (error: any) {
    console.error("Folder deletion error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
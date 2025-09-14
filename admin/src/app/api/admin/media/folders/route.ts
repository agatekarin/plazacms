import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/admin/media/folders - List all folders with hierarchy
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parent_id");
    const includeChildren = searchParams.get("include_children") === "true";

    let query = `
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
    `;

    const params: any[] = [];
    if (parentId) {
      query += ` WHERE f.parent_id = $1`;
      params.push(parentId);
    } else if (parentId === null) {
      query += ` WHERE f.parent_id IS NULL`;
    }

    query += `
      ORDER BY f.path ASC
    `;

    const result = await pool.query(query, params);
    
    // Ensure counts are proper numbers, not strings
    let folders = result.rows.map(folder => ({
      ...folder,
      media_count: parseInt(folder.media_count) || 0,
      children_count: parseInt(folder.children_count) || 0
    }));

    // If include_children is true, fetch full hierarchy
    if (includeChildren) {
      const hierarchyQuery = `
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
          ft.*,
          COUNT(m.id) as media_count,
          COUNT(cf.id) as children_count
        FROM folder_tree ft
        LEFT JOIN media m ON m.folder_id = ft.id
        LEFT JOIN media_folders cf ON cf.parent_id = ft.id
        GROUP BY ft.id, ft.name, ft.parent_id, ft.path, ft.description, ft.created_at, ft.updated_at, ft.level
        ORDER BY ft.path ASC
      `;
      
      const hierarchyResult = await pool.query(hierarchyQuery);
      folders = hierarchyResult.rows;
    }

    return NextResponse.json({
      success: true,
      folders,
      total: folders.length
    });

  } catch (error: any) {
    console.error("Folders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

// POST /api/admin/media/folders - Create new folder
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, parent_id, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    // Generate path based on parent
    let path = `/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (parent_id) {
      const parentResult = await pool.query(
        "SELECT path FROM media_folders WHERE id = $1",
        [parent_id]
      );
      
      if (parentResult.rows.length === 0) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
      
      const parentPath = parentResult.rows[0].path;
      path = `${parentPath === '/' ? '' : parentPath}/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }

    // Check if path already exists
    const existingResult = await pool.query(
      "SELECT id FROM media_folders WHERE path = $1",
      [path]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "Folder with this name already exists in the parent folder" }, { status: 409 });
    }

    // Create folder
    const result = await pool.query(
      `INSERT INTO media_folders (name, parent_id, path, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name.trim(), parent_id || null, path, description?.trim() || null]
    );

    return NextResponse.json({
      success: true,
      folder: result.rows[0]
    });

  } catch (error: any) {
    console.error("Folder creation error:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
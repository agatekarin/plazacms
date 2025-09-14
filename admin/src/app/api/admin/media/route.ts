// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev instead

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PUT() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PATCH() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

/*
ORIGINAL CODE COMMENTED OUT:
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/admin/media?page=&pageSize=&folder_id=&search=&type=&view=
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "24", 10)));
    const folderId = searchParams.get("folder_id");
    const search = searchParams.get("search");
    const mediaType = searchParams.get("type");
    const view = searchParams.get("view") || "grid";
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (folderId) {
      conditions.push(`m.folder_id = $${paramIndex++}`);
      params.push(folderId);
    } else if (folderId === null || searchParams.has("folder_id")) {
      conditions.push(`m.folder_id IS NULL`);
    }

    if (search) {
      conditions.push(`(m.filename ILIKE $${paramIndex} OR m.alt_text ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (mediaType && mediaType !== "all") {
      conditions.push(`m.media_type = $${paramIndex++}`);
      params.push(mediaType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Main query with folder info
    const listQuery = `
      SELECT 
        m.id, m.filename, m.file_url, m.file_type, m.size, m.alt_text, 
        m.media_type, m.created_at, m.updated_at, m.folder_id,
        f.name as folder_name, f.path as folder_path,
        u.name as uploaded_by_name
      FROM media m
      LEFT JOIN media_folders f ON f.id = m.folder_id
      LEFT JOIN users u ON u.id = m.uploaded_by
      ${whereClause}
      ORDER BY m.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as count
      FROM media m
      LEFT JOIN media_folders f ON f.id = m.folder_id
      ${whereClause}
    `;

    const listParams = [...params, pageSize, offset];
    const countParams = params;

    const [countRes, listRes] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(listQuery, listParams)
    ]);

    const total = parseInt(countRes.rows[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      items: listRes.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filters: {
        folder_id: folderId,
        search,
        type: mediaType,
        view
      }
    });

  } catch (error: any) {
    console.error("Media GET error:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}


*/

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
import { deleteFileFromR2 } from "@/lib/r2-storage";

// GET /api/admin/media/[id] - Get specific media details
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
         m.id, m.filename, m.file_url, m.file_type, m.size, m.alt_text, 
         m.media_type, m.created_at, m.updated_at, m.folder_id,
         f.name as folder_name, f.path as folder_path,
         u.username as uploaded_by_name
       FROM media m
       LEFT JOIN media_folders f ON f.id = m.folder_id
       LEFT JOIN users u ON u.id = m.uploaded_by
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      media: result.rows[0]
    });

  } catch (error: any) {
    console.error("Media GET error:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

// PATCH /api/admin/media/[id] - Update media metadata
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { alt_text, media_type, folder_id } = body;

    // Validate media type if provided
    if (media_type) {
      const validTypes = ['product_image', 'product_variant_image', 'user_profile', 'review_image', 'site_asset', 'other'];
      if (!validTypes.includes(media_type)) {
        return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
      }
    }

    // Validate folder exists (if provided and not null)
    if (folder_id && folder_id !== "") {
      const folderCheck = await pool.query(
        "SELECT id FROM media_folders WHERE id = $1",
        [folder_id]
      );
      
      if (folderCheck.rows.length === 0) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (alt_text !== undefined) {
      updateFields.push(`alt_text = $${paramIndex++}`);
      updateValues.push(alt_text || null);
    }
    
    if (media_type !== undefined) {
      updateFields.push(`media_type = $${paramIndex++}`);
      updateValues.push(media_type);
    }
    
    if (folder_id !== undefined) {
      updateFields.push(`folder_id = $${paramIndex++}`);
      updateValues.push(folder_id || null);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE media SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING 
       id, filename, file_url, file_type, size, alt_text, media_type, created_at, updated_at, folder_id`,
      updateValues
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Media updated successfully",
      media: result.rows[0]
    });

  } catch (error: any) {
    console.error("Media update error:", error);
    return NextResponse.json({ error: "Failed to update media" }, { status: 500 });
  }
}

// DELETE /api/admin/media/[id] - Delete media
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if media is in use (optional - depends on your use case)
    // You might want to check product_images, product_variant_images, etc.
    const usageCheck = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM product_images WHERE media_id = $1) as product_usage,
         (SELECT COUNT(*) FROM product_variant_images WHERE media_id = $1) as variant_usage`,
      [id]
    );

    const usage = usageCheck.rows[0];
    const totalUsage = parseInt(usage.product_usage) + parseInt(usage.variant_usage);

    if (totalUsage > 0) {
      return NextResponse.json({ 
        error: `Cannot delete media that is in use. Found ${totalUsage} references. Remove from products first.` 
      }, { status: 400 });
    }

    // Get media details first for file URL
    const mediaResult = await pool.query(
      "SELECT filename, file_url FROM media WHERE id = $1",
      [id]
    );

    if (mediaResult.rows.length === 0) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const media = mediaResult.rows[0];

    // Delete from R2 first
    try {
      await deleteFileFromR2(media.file_url);
    } catch (error) {
      console.error("Failed to delete from R2:", error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete media record
    const result = await pool.query(
      "DELETE FROM media WHERE id = $1 RETURNING filename",
      [id]
    );

    const deletedFilename = result.rows[0].filename;

    return NextResponse.json({
      success: true,
      message: `Media "${deletedFilename}" deleted successfully`
    });

  } catch (error: any) {
    console.error("Media deletion error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
*/

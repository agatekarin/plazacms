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
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// DELETE /api/admin/products/[id]/media/[mediaId] - Remove image from product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: productId, mediaId } = await params;

    // Check if this is the featured image before deleting
    const featuredCheck = await pool.query(
      `SELECT featured_image_id FROM products WHERE id = $1`,
      [productId]
    );
    const isFeaturedImage = featuredCheck.rows[0]?.featured_image_id === mediaId;

    // Remove from product_images junction table
    const result = await pool.query(
      `DELETE FROM product_images 
       WHERE product_id = $1 AND media_id = $2`,
      [productId, mediaId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Image not found in product" },
        { status: 404 }
      );
    }

    // Reset media entity info if no other products use this image
    const otherUsage = await pool.query(
      `SELECT COUNT(*) as count FROM product_images WHERE media_id = $1`,
      [mediaId]
    );

    if (otherUsage.rows[0].count === 0) {
      await pool.query(
        `UPDATE media 
         SET entity_id = NULL, media_type = 'other'
         WHERE id = $1`,
        [mediaId]
      );
    }

    // If this was the featured image, clear featured_image_id from products table
    if (isFeaturedImage) {
      await pool.query(
        `UPDATE products SET featured_image_id = NULL WHERE id = $1`,
        [productId]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image removed from product successfully"
    });
  } catch (error) {
    console.error("Remove product media error:", error);
    return NextResponse.json(
      { error: "Failed to remove image from product" },
      { status: 500 }
    );
  }
}
*/

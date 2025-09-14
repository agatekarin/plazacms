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

// PUT /api/admin/products/[id]/media/reorder - Reorder product images
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: productId } = await params;
    const body = await request.json();
    const { media_id, display_order } = body;

    if (!media_id || display_order === undefined) {
      return NextResponse.json(
        { error: "media_id and display_order are required" },
        { status: 400 }
      );
    }

    // If setting as featured (display_order 0), move current featured to position 1
    if (display_order === 0) {
      // First, move current featured image to position 1
      await pool.query(
        `UPDATE product_images 
         SET display_order = 1
         WHERE product_id = $1 AND display_order = 0 AND media_id != $2`,
        [productId, media_id]
      );
    }

    // Update the target image's position
    await pool.query(
      `UPDATE product_images 
       SET display_order = $3
       WHERE product_id = $1 AND media_id = $2`,
      [productId, media_id, display_order]
    );

    // If setting as featured (display_order 0), update products.featured_image_id
    if (display_order === 0) {
      await pool.query(
        `UPDATE products SET featured_image_id = $1 WHERE id = $2`,
        [media_id, productId]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image order updated successfully"
    });
  } catch (error) {
    console.error("Reorder product media error:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}
*/

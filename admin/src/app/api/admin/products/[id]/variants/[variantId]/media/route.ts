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

// POST /api/admin/products/[id]/variants/[variantId]/media - Set variant image
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: productId, variantId } = await params;
    const body = await request.json();
    const { media_id } = body;

    if (!media_id) {
      return NextResponse.json({ error: "media_id is required" }, { status: 400 });
    }

    // Remove existing variant image
    await pool.query(
      `DELETE FROM product_variant_images WHERE product_variant_id = $1`,
      [variantId]
    );

    // Add new variant image
    await pool.query(
      `INSERT INTO product_variant_images (product_variant_id, media_id) 
       VALUES ($1, $2)`,
      [variantId, media_id]
    );

    // Update media table with variant entity info
    await pool.query(
      `UPDATE media 
       SET entity_id = $1, media_type = 'product_variant_image'
       WHERE id = $2`,
      [variantId, media_id]
    );

    return NextResponse.json({
      success: true,
      message: "Variant image set successfully"
    });
  } catch (error) {
    console.error("Set variant media error:", error);
    return NextResponse.json(
      { error: "Failed to set variant image" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id]/variants/[variantId]/media - Remove variant image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variantId } = await params;

    // Get media_id before deletion for cleanup
    const mediaResult = await pool.query(
      `SELECT media_id FROM product_variant_images WHERE product_variant_id = $1`,
      [variantId]
    );

    // Remove variant image
    const result = await pool.query(
      `DELETE FROM product_variant_images WHERE product_variant_id = $1`,
      [variantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Variant image not found" },
        { status: 404 }
      );
    }

    // Reset media entity info if this was the only usage
    if (mediaResult.rows.length > 0) {
      const mediaId = mediaResult.rows[0].media_id;
      const otherUsage = await pool.query(
        `SELECT COUNT(*) as count FROM product_variant_images WHERE media_id = $1`,
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
    }

    return NextResponse.json({
      success: true,
      message: "Variant image removed successfully"
    });
  } catch (error) {
    console.error("Remove variant media error:", error);
    return NextResponse.json(
      { error: "Failed to remove variant image" },
      { status: 500 }
    );
  }
}
*/

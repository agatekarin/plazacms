import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET /api/admin/products/[id]/media - Get product images
export async function GET(
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

    const result = await pool.query(
      `SELECT 
        pi.product_id,
        pi.media_id,
        pi.display_order,
        m.filename,
        m.file_url,
        m.file_type,
        m.size,
        m.alt_text,
        m.created_at
       FROM product_images pi
       JOIN media m ON m.id = pi.media_id
       WHERE pi.product_id = $1
       ORDER BY pi.display_order ASC, pi.media_id ASC`,
      [productId]
    );

    return NextResponse.json({
      success: true,
      images: result.rows
    });
  } catch (error) {
    console.error("Get product media error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product media" },
      { status: 500 }
    );
  }
}

// POST /api/admin/products/[id]/media - Add image to product
export async function POST(
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
    const { media_id, display_order = 999, replace_featured = false } = body;

    if (!media_id) {
      return NextResponse.json({ error: "media_id is required" }, { status: 400 });
    }

    // If replacing featured image, remove existing featured (display_order 0)
    if (replace_featured) {
      await pool.query(
        `DELETE FROM product_images WHERE product_id = $1 AND display_order = 0`,
        [productId]
      );
    }

    // Insert new product image
    await pool.query(
      `INSERT INTO product_images (product_id, media_id, display_order) 
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, media_id) 
       DO UPDATE SET display_order = EXCLUDED.display_order`,
      [productId, media_id, display_order]
    );

    // Update media table with product entity info
    await pool.query(
      `UPDATE media 
       SET entity_id = $1, media_type = 'product_image'
       WHERE id = $2`,
      [productId, media_id]
    );

    // If this is featured image (display_order 0), update products.featured_image_id
    if (display_order === 0 || replace_featured) {
      await pool.query(
        `UPDATE products SET featured_image_id = $1 WHERE id = $2`,
        [media_id, productId]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image added to product successfully"
    });
  } catch (error) {
    console.error("Add product media error:", error);
    return NextResponse.json(
      { error: "Failed to add image to product" },
      { status: 500 }
    );
  }
}
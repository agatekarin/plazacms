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
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mediaIds, operation, data } = body;

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: "Media IDs are required" },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: "Operation is required" },
        { status: 400 }
      );
    }

    let updateQuery = "";
    let values: any[] = [];

    switch (operation) {
      case "change_type":
        if (!data?.media_type) {
          return NextResponse.json(
            { error: "Media type is required for change_type operation" },
            { status: 400 }
          );
        }

        // Validate media_type
        const validTypes = [
          "product_image",
          "product_variant_image",
          "user_profile",
          "review_image",
          "other",
          "site_asset",
        ];
        if (!validTypes.includes(data.media_type)) {
          return NextResponse.json(
            { error: "Invalid media type" },
            { status: 400 }
          );
        }

        updateQuery = `
          UPDATE media 
          SET media_type = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ANY($2::uuid[])
        `;
        values = [data.media_type, mediaIds];
        break;

      case "change_folder":
        // folder_id can be null (for root folder)
        const folderId =
          data?.folder_id === "__root__" ? null : data?.folder_id;

        updateQuery = `
          UPDATE media 
          SET folder_id = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ANY($2::uuid[])
        `;
        values = [folderId, mediaIds];
        break;

      case "delete":
        // First check if any media is referenced by other tables
        const referencesCheck = await db.query(
          `
          SELECT m.id, m.filename, 
                 CASE 
                   WHEN EXISTS(SELECT 1 FROM categories WHERE image_id = m.id) THEN 'categories'
                   WHEN EXISTS(SELECT 1 FROM products WHERE featured_image_id = m.id) THEN 'products'
                   WHEN EXISTS(SELECT 1 FROM product_images WHERE media_id = m.id) THEN 'product_images'
                   WHEN EXISTS(SELECT 1 FROM product_variant_images WHERE media_id = m.id) THEN 'product_variant_images'
                   WHEN EXISTS(SELECT 1 FROM payment_gateways WHERE logo_media_id = m.id) THEN 'payment_gateways'
                   WHEN EXISTS(SELECT 1 FROM payment_methods WHERE logo_media_id = m.id) THEN 'payment_methods'
                   WHEN EXISTS(SELECT 1 FROM site_settings WHERE logo_media_id = m.id OR favicon_media_id = m.id OR default_product_image_id = m.id OR default_user_avatar_id = m.id OR social_share_image_id = m.id) THEN 'site_settings'
                   ELSE NULL
                 END as referenced_table
          FROM media m 
          WHERE m.id = ANY($1::uuid[]) AND (
            EXISTS(SELECT 1 FROM categories WHERE image_id = m.id) OR
            EXISTS(SELECT 1 FROM products WHERE featured_image_id = m.id) OR
            EXISTS(SELECT 1 FROM product_images WHERE media_id = m.id) OR
            EXISTS(SELECT 1 FROM product_variant_images WHERE media_id = m.id) OR
            EXISTS(SELECT 1 FROM payment_gateways WHERE logo_media_id = m.id) OR
            EXISTS(SELECT 1 FROM payment_methods WHERE logo_media_id = m.id) OR
            EXISTS(SELECT 1 FROM site_settings WHERE logo_media_id = m.id OR favicon_media_id = m.id OR default_product_image_id = m.id OR default_user_avatar_id = m.id OR social_share_image_id = m.id)
          )
        `,
          [mediaIds]
        );

        if (referencesCheck.rows.length > 0) {
          const referencedFiles = referencesCheck.rows
            .map((row) => `${row.filename} (used in ${row.referenced_table})`)
            .join(", ");

          return NextResponse.json(
            {
              error: `Cannot delete files that are in use: ${referencedFiles}`,
              referencedFiles: referencesCheck.rows,
            },
            { status: 400 }
          );
        }

        updateQuery = `DELETE FROM media WHERE id = ANY($1::uuid[])`;
        values = [mediaIds];
        break;

      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 }
        );
    }

    const result = await db.query(updateQuery, values);

    const affectedRows =
      operation === "delete" ? result.rowCount : result.rowCount;

    return NextResponse.json({
      success: true,
      message: `Successfully ${
        operation === "change_type"
          ? "updated media type for"
          : operation === "change_folder"
          ? "moved"
          : "deleted"
      } ${affectedRows} item(s)`,
      affectedRows,
    });
  } catch (error: any) {
    console.error("Bulk media operation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get bulk operation info (for validation)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const mediaIds = url.searchParams.get("ids")?.split(",") || [];

    if (mediaIds.length === 0) {
      return NextResponse.json(
        { error: "Media IDs are required" },
        { status: 400 }
      );
    }

    // Get media info and check for references
    const mediaInfo = await db.query(
      `
      SELECT 
        m.id,
        m.filename,
        m.media_type,
        m.folder_id,
        f.name as folder_name,
        CASE 
          WHEN EXISTS(SELECT 1 FROM categories WHERE image_id = m.id) THEN true
          WHEN EXISTS(SELECT 1 FROM products WHERE featured_image_id = m.id) THEN true
          WHEN EXISTS(SELECT 1 FROM product_images WHERE media_id = m.id) THEN true
          WHEN EXISTS(SELECT 1 FROM product_variant_images WHERE media_id = m.id) THEN true
          WHEN EXISTS(SELECT 1 FROM payment_gateways WHERE logo_media_id = m.id) THEN true
          WHEN EXISTS(SELECT 1 FROM payment_methods WHERE logo_media_id = m.id) THEN true
          WHEN EXISTS(SELECT 1 FROM site_settings WHERE logo_media_id = m.id OR favicon_media_id = m.id OR default_product_image_id = m.id OR default_user_avatar_id = m.id OR social_share_image_id = m.id) THEN true
          ELSE false
        END as is_referenced
      FROM media m
      LEFT JOIN media_folders f ON m.folder_id = f.id
      WHERE m.id = ANY($1::uuid[])
      ORDER BY m.filename
    `,
      [mediaIds]
    );

    // Get available folders
    const folders = await db.query(`
      SELECT id, name, path 
      FROM media_folders 
      ORDER BY path
    `);

    return NextResponse.json({
      success: true,
      media: mediaInfo.rows,
      folders: folders.rows,
      mediaTypes: [
        { value: "product_image", label: "Product Image" },
        { value: "product_variant_image", label: "Product Variant Image" },
        { value: "user_profile", label: "User Profile" },
        { value: "review_image", label: "Review Image" },
        { value: "site_asset", label: "Site Asset" },
        { value: "other", label: "Other" },
      ],
    });
  } catch (error: any) {
    console.error("Get bulk operation info error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

*/

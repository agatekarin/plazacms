import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const reviewImportExportRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// =====================================================
// REVIEW IMPORT/EXPORT API ROUTES
// =====================================================

// GET /api/admin/reviews/import-export/stats - Get import/export statistics
reviewImportExportRoutes.get("/stats", adminMiddleware, async (c) => {
  try {
    const sql = getDb(c);

    // Get total reviews count
    const totalQuery = `
      SELECT COUNT(*)::int as total_reviews
      FROM public.reviews
    `;
    const totalResult = await sql.unsafe(totalQuery, []);
    const totalReviews = totalResult[0]?.total_reviews || 0;

    // Get reviews with images count
    const withImagesQuery = `
      SELECT COUNT(DISTINCT r.id)::int as reviews_with_images
      FROM public.reviews r
      INNER JOIN public.review_images ri ON r.id = ri.review_id
    `;
    const withImagesResult = await sql.unsafe(withImagesQuery, []);
    const reviewsWithImages = withImagesResult[0]?.reviews_with_images || 0;

    // TODO: Add last_export_date and last_import_date tracking
    // For now, return mock data
    return c.json({
      total_reviews: totalReviews,
      reviews_with_images: reviewsWithImages,
      last_export_date: null,
      last_import_date: null,
    });
  } catch (error) {
    console.error("Error fetching import/export stats:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// GET /api/admin/reviews/export - Export reviews to CSV/Excel
reviewImportExportRoutes.get("/export", adminMiddleware, async (c) => {
  try {
    const url = new URL(c.req.url);
    const format = url.searchParams.get("format") || "csv";
    const status = url.searchParams.get("status") || "";
    const productId = url.searchParams.get("product_id") || "";
    const dateFrom = url.searchParams.get("date_from") || "";
    const dateTo = url.searchParams.get("date_to") || "";

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (productId) {
      conditions.push(`r.product_id = $${paramIndex}`);
      params.push(productId);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`r.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`r.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get reviews data
    const reviewsQuery = `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.status,
        r.is_verified_purchase,
        r.helpful_count,
        r.admin_response,
        r.moderation_status,
        r.moderation_notes,
        r.created_at,
        r.updated_at,
        p.name as product_name,
        p.slug as product_slug,
        u.name as user_name,
        u.email as user_email,
        o.order_number,
        oi.product_name as order_item_name,
        oi.product_price as order_item_price,
        oi.quantity as order_item_quantity,
        -- Aggregate review images
        COALESCE(
          json_agg(
            json_build_object(
              'media_id', ri.media_id,
              'display_order', ri.display_order,
              'filename', m.filename,
              'url', m.url
            ) ORDER BY ri.display_order
          ) FILTER (WHERE ri.media_id IS NOT NULL), 
          '[]'::json
        ) as images
      FROM public.reviews r
      LEFT JOIN public.products p ON r.product_id = p.id
      LEFT JOIN public.users u ON r.user_id = u.id
      LEFT JOIN public.orders o ON r.order_id = o.id
      LEFT JOIN public.order_items oi ON r.order_item_id = oi.id
      LEFT JOIN public.review_images ri ON r.id = ri.review_id
      LEFT JOIN public.media m ON ri.media_id = m.id
      ${whereClause}
      GROUP BY r.id, p.name, p.slug, u.name, u.email, o.order_number, 
               oi.product_name, oi.product_price, oi.quantity
      ORDER BY r.created_at DESC
    `;

    const sql = getDb(c);
    const reviews = await sql.unsafe(reviewsQuery, params);

    if (format === "csv") {
      // Generate CSV
      const csvHeaders = [
        "ID",
        "Rating",
        "Comment",
        "Status",
        "Verified Purchase",
        "Helpful Count",
        "Admin Response",
        "Moderation Status",
        "Moderation Notes",
        "Created At",
        "Updated At",
        "Product Name",
        "Product Slug",
        "User Name",
        "User Email",
        "Order Number",
        "Order Item Name",
        "Order Item Price",
        "Order Item Quantity",
        "Images",
      ];

      const csvRows = reviews.map((review) => [
        review.id,
        review.rating,
        `"${(review.comment || "").replace(/"/g, '""')}"`,
        review.status,
        review.is_verified_purchase ? "Yes" : "No",
        review.helpful_count,
        `"${(review.admin_response || "").replace(/"/g, '""')}"`,
        review.moderation_status,
        `"${(review.moderation_notes || "").replace(/"/g, '""')}"`,
        review.created_at,
        review.updated_at,
        `"${(review.product_name || "").replace(/"/g, '""')}"`,
        review.product_slug,
        `"${(review.user_name || "").replace(/"/g, '""')}"`,
        review.user_email,
        review.order_number,
        `"${(review.order_item_name || "").replace(/"/g, '""')}"`,
        review.order_item_price,
        review.order_item_quantity,
        `"${JSON.stringify(review.images).replace(/"/g, '""')}"`,
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.join(","))
        .join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="reviews-export-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    } else {
      // Return JSON format
      return c.json({
        reviews,
        export_info: {
          format: "json",
          total_count: reviews.length,
          exported_at: new Date().toISOString(),
          filters: {
            status,
            product_id: productId,
            date_from: dateFrom,
            date_to: dateTo,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error exporting reviews:", error);
    return c.json({ error: "Failed to export reviews" }, 500);
  }
});

// POST /api/admin/reviews/import - Import reviews from CSV/JSON
reviewImportExportRoutes.post("/import", adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { reviews, options = {} } = body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return c.json({ error: "Reviews array is required" }, 400);
    }

    const {
      skip_duplicates = true,
      update_existing = false,
      default_status = "pending",
      default_moderation_status = "pending",
    } = options;

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const reviewData of reviews) {
      try {
        const {
          product_id,
          user_id,
          order_id,
          order_item_id,
          rating,
          comment,
          reviewer_name,
          reviewer_email,
          review_type = "imported",
          status = default_status,
          moderation_status = default_moderation_status,
          is_verified_purchase = false,
          images = [],
        } = reviewData;

        // Validate required fields
        if (!product_id || !rating || rating < 1 || rating > 5) {
          results.errors.push({
            review: reviewData,
            error: "Missing required fields: product_id and rating (1-5)",
          });
          continue;
        }

        const sql = getDb(c);

        // Check if product exists
        const productCheck = await sql.unsafe(
          "SELECT id FROM public.products WHERE id = $1",
          [product_id]
        );

        if (productCheck.length === 0) {
          results.errors.push({
            review: reviewData,
            error: "Product not found",
          });
          continue;
        }

        // Check if user exists (if provided)
        if (user_id) {
          const userCheck = await sql.unsafe(
            "SELECT id FROM public.users WHERE id = $1",
            [user_id]
          );

          if (userCheck.length === 0) {
            results.errors.push({
              review: reviewData,
              error: "User not found",
            });
            continue;
          }
        }

        // Check for existing review (if skip_duplicates is true)
        if (skip_duplicates) {
          const existingReview = await sql.unsafe(
            "SELECT id FROM public.reviews WHERE product_id = $1 AND user_id = $2 AND rating = $3",
            [product_id, user_id, rating]
          );

          if (existingReview.length > 0) {
            if (update_existing) {
              // Update existing review
              const updateQuery = `
                UPDATE public.reviews 
                SET 
                  comment = $4,
                  reviewer_name = $5,
                  reviewer_email = $6,
                  status = $7,
                  moderation_status = $8,
                  is_verified_purchase = $9,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
              `;

              await sql.unsafe(updateQuery, [
                existingReview[0].id,
                comment,
                reviewer_name,
                reviewer_email,
                status,
                moderation_status,
                is_verified_purchase,
              ]);

              results.updated++;
            } else {
              results.skipped++;
            }
            continue;
          }
        }

        // Insert new review
        const insertQuery = `
          INSERT INTO public.reviews (
            product_id, user_id, order_id, order_item_id, rating, comment,
            reviewer_name, reviewer_email, review_type, status, moderation_status,
            is_verified_purchase, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *
        `;

        const newReview = await sql.unsafe(insertQuery, [
          product_id,
          user_id,
          order_id,
          order_item_id,
          rating,
          comment,
          reviewer_name,
          reviewer_email,
          review_type,
          status,
          moderation_status,
          is_verified_purchase,
        ]);

        // Handle images if provided
        if (images && Array.isArray(images) && images.length > 0) {
          for (const [index, mediaId] of images.entries()) {
            try {
              await sql.unsafe(
                "INSERT INTO public.review_images (review_id, media_id, display_order) VALUES ($1, $2, $3) ON CONFLICT (review_id, media_id) DO NOTHING",
                [newReview[0].id, mediaId, index + 1]
              );
            } catch (imageError) {
              console.error("Error adding review image:", imageError);
            }
          }
        }

        results.imported++;
      } catch (error) {
        results.errors.push({
          review: reviewData,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return c.json({
      message: "Import completed",
      results,
    });
  } catch (error) {
    console.error("Error importing reviews:", error);
    return c.json({ error: "Failed to import reviews" }, 500);
  }
});

// GET /api/admin/reviews/import/template - Get import template
reviewImportExportRoutes.get("/import/template", adminMiddleware, async (c) => {
  try {
    const url = new URL(c.req.url);
    const format = url.searchParams.get("format") || "csv";

    const template = {
      headers: [
        "product_id",
        "user_id",
        "order_id",
        "order_item_id",
        "rating",
        "comment",
        "reviewer_name",
        "reviewer_email",
        "review_type",
        "status",
        "moderation_status",
        "is_verified_purchase",
        "images",
      ],
      sample_data: [
        {
          product_id: "uuid-of-product",
          user_id: "uuid-of-user (optional)",
          order_id: "uuid-of-order (optional)",
          order_item_id: "uuid-of-order-item (optional)",
          rating: 5,
          comment: "Great product!",
          reviewer_name: "John Doe",
          reviewer_email: "john@example.com",
          review_type: "imported",
          status: "pending",
          moderation_status: "pending",
          is_verified_purchase: false,
          images: '["media-uuid-1", "media-uuid-2"]',
        },
      ],
      instructions: [
        "product_id: Required. UUID of the product being reviewed",
        "user_id: Optional. UUID of the user (leave empty for guest reviews)",
        "order_id: Optional. UUID of the order",
        "order_item_id: Optional. UUID of the order item",
        "rating: Required. Integer from 1 to 5",
        "comment: Optional. Review text",
        "reviewer_name: Optional. Name of the reviewer",
        "reviewer_email: Optional. Email of the reviewer",
        "review_type: Optional. Type of review (imported, user, guest)",
        "status: Optional. Review status (pending, approved, rejected, hidden)",
        "moderation_status: Optional. Moderation status (pending, approved, rejected, flagged)",
        "is_verified_purchase: Optional. Boolean indicating if this is a verified purchase",
        "images: Optional. JSON array of media UUIDs",
      ],
    };

    if (format === "csv") {
      const csvHeaders = template.headers.join(",");
      const csvSample = template.sample_data
        .map((row) =>
          template.headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              return typeof value === "string" && value.includes(",")
                ? `"${value}"`
                : value;
            })
            .join(",")
        )
        .join("\n");

      const csvContent = [csvHeaders, csvSample].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            'attachment; filename="reviews-import-template.csv"',
        },
      });
    } else {
      return c.json(template);
    }
  } catch (error) {
    console.error("Error generating import template:", error);
    return c.json({ error: "Failed to generate import template" }, 500);
  }
});

export default reviewImportExportRoutes;

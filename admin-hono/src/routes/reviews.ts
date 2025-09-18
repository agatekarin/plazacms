import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const reviewsRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// =====================================================
// REVIEW MANAGEMENT API ROUTES
// =====================================================

// GET /api/admin/reviews - List reviews with filtering and pagination
reviewsRoutes.get("/", adminMiddleware, async (c) => {
  try {
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const rating = url.searchParams.get("rating") || "";
    const productId = url.searchParams.get("product_id") || "";
    const userId = url.searchParams.get("user_id") || "";
    const verifiedOnly = url.searchParams.get("verified_only") === "true";
    const sortBy = url.searchParams.get("sort_by") || "created_at";
    const sortOrder = url.searchParams.get("sort_order") || "desc";
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(r.comment ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (rating) {
      conditions.push(`r.rating = $${paramIndex}`);
      params.push(parseInt(rating));
      paramIndex++;
    }

    if (productId) {
      conditions.push(`r.product_id = $${paramIndex}`);
      params.push(productId);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`r.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (verifiedOnly) {
      conditions.push(`r.is_verified_purchase = true`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Build ORDER BY clause
    let orderBy = `r.${sortBy}`;
    if (sortBy === "product_name") {
      orderBy = "p.name";
    } else if (sortBy === "user_name") {
      orderBy = "u.name";
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM public.reviews r
      LEFT JOIN public.products p ON r.product_id = p.id
      LEFT JOIN public.users u ON r.user_id = u.id
      ${whereClause}
    `;

    const sql = getDb(c);
    const countResult = await sql.unsafe(countQuery, params);
    const total = parseInt(countResult[0]?.total || "0");

    // Get reviews with pagination
    const reviewsQuery = `
      SELECT 
        r.*,
        p.name as product_name,
        p.slug as product_slug,
        u.name as user_name,
        u.email as user_email,
        o.order_number,
        oi.product_name as order_item_name,
        oi.product_price as order_item_price,
        oi.quantity as order_item_quantity,
        -- Count review images
        (SELECT COUNT(*) FROM public.review_images ri WHERE ri.review_id = r.id) as image_count
      FROM public.reviews r
      LEFT JOIN public.products p ON r.product_id = p.id
      LEFT JOIN public.users u ON r.user_id = u.id
      LEFT JOIN public.orders o ON r.order_id = o.id
      LEFT JOIN public.order_items oi ON r.order_item_id = oi.id
      ${whereClause}
      ORDER BY ${orderBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const reviews = await sql.unsafe(reviewsQuery, params);

    return c.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return c.json({ error: "Failed to fetch reviews" }, 500);
  }
});

// GET /api/admin/reviews/analytics - must be before ":id" route to avoid clash
reviewsRoutes.get("/analytics", adminMiddleware, async (c) => {
  try {
    const url = new URL(c.req.url);
    const productId = url.searchParams.get("product_id") || "";
    let dateFrom = url.searchParams.get("date_from") || "";
    let dateTo = url.searchParams.get("date_to") || "";
    const period =
      url.searchParams.get("period") || url.searchParams.get("timeRange") || "";

    if (period && !dateFrom && !dateTo) {
      const now = new Date();
      const toIso = (d: Date) => d.toISOString();
      dateTo = toIso(now);
      const from = new Date(now);
      switch (period) {
        case "7d":
          from.setDate(now.getDate() - 7);
          break;
        case "30d":
          from.setDate(now.getDate() - 30);
          break;
        case "90d":
          from.setDate(now.getDate() - 90);
          break;
        case "1y":
          from.setFullYear(now.getFullYear() - 1);
          break;
        case "all":
        default:
          dateFrom = "";
          dateTo = "";
      }
      if (period !== "all") {
        dateFrom = toIso(from);
      }
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
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

    const statsQuery = `
      SELECT 
        COUNT(*)::int as total_reviews,
        COALESCE(AVG(rating), 0)::float as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::int as five_star_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::int as four_star_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::int as three_star_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::int as two_star_count,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::int as one_star_count,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END)::int as verified_reviews_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::int as approved_reviews_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_reviews_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int as rejected_reviews_count,
        COUNT(CASE WHEN admin_response IS NOT NULL THEN 1 END)::int as responded_reviews_count,
        COALESCE(SUM(helpful_count), 0)::int as total_helpful_votes
      FROM public.reviews r
      ${whereClause}
    `;

    const sql = getDb(c);
    const stats = (await sql.unsafe(statsQuery, params))[0];

    const imagesCountQuery = `
      SELECT COUNT(DISTINCT ri.review_id)::int AS with_images
      FROM public.review_images ri
      JOIN public.reviews r ON r.id = ri.review_id
      ${whereClause}
    `;
    const withImagesRow = (await sql.unsafe(imagesCountQuery, params))[0] || {
      with_images: 0,
    };

    const topProductsQuery = `
      SELECT r.product_id, p.name as product_name, COUNT(*)::int as review_count, COALESCE(AVG(r.rating),0)::float as average_rating
      FROM public.reviews r
      JOIN public.products p ON p.id = r.product_id
      ${whereClause}
      GROUP BY r.product_id, p.name
      ORDER BY review_count DESC
      LIMIT 5
    `;
    const topProducts = await sql.unsafe(topProductsQuery, params);

    const topReviewersQuery = `
      SELECT r.user_id, u.email as user_email, COUNT(*)::int as review_count, COALESCE(AVG(r.rating),0)::float as average_rating
      FROM public.reviews r
      LEFT JOIN public.users u ON u.id = r.user_id
      ${whereClause}
      GROUP BY r.user_id, u.email
      ORDER BY review_count DESC
      LIMIT 5
    `;
    const topReviewers = await sql.unsafe(topReviewersQuery, params);

    const monthlyTrendsQuery = `
      SELECT to_char(date_trunc('month', r.created_at), 'YYYY-MM') as month,
             COUNT(*)::int as reviews_count,
             COALESCE(AVG(r.rating),0)::float as average_rating
      FROM public.reviews r
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6
    `;
    const monthlyTrendsDesc = await sql.unsafe(monthlyTrendsQuery, params);
    const monthlyTrends = [...monthlyTrendsDesc].reverse();

    const total = Number(stats?.total_reviews || 0);
    const approvalRate =
      total > 0 ? (Number(stats.approved_reviews_count) / total) * 100 : 0;
    const verifiedPct =
      total > 0 ? (Number(stats.verified_reviews_count) / total) * 100 : 0;
    const withImagesPct =
      total > 0 ? (Number(withImagesRow.with_images) / total) * 100 : 0;
    const withAdminRespPct =
      total > 0 ? (Number(stats.responded_reviews_count) / total) * 100 : 0;

    const rating_distribution = {
      "1": Number(stats.one_star_count || 0),
      "2": Number(stats.two_star_count || 0),
      "3": Number(stats.three_star_count || 0),
      "4": Number(stats.four_star_count || 0),
      "5": Number(stats.five_star_count || 0),
    } as const;

    const status_distribution = {
      pending: Number(stats.pending_reviews_count || 0),
      approved: Number(stats.approved_reviews_count || 0),
      rejected: Number(stats.rejected_reviews_count || 0),
    } as const;

    return c.json({
      total_reviews: total,
      average_rating: Number(stats.average_rating || 0),
      approval_rate: approvalRate,
      total_helpful_votes: Number(stats.total_helpful_votes || 0),
      rating_distribution,
      status_distribution,
      verified_purchase_percentage: verifiedPct,
      with_images_percentage: withImagesPct,
      with_admin_response_percentage: withAdminRespPct,
      top_products: topProducts,
      top_reviewers: topReviewers,
      monthly_trends: monthlyTrends,
    });
  } catch (error) {
    console.error("Error fetching review analytics:", error);
    return c.json({ error: "Failed to fetch review analytics" }, 500);
  }
});

// GET /api/admin/reviews/:id - Get review detail
reviewsRoutes.get("/:id", adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();

    const reviewQuery = `
      SELECT 
        r.*,
        p.name as product_name,
        p.slug as product_slug,
        u.name as user_name,
        u.email as user_email,
        o.order_number,
        oi.product_name as order_item_name,
        oi.product_price as order_item_price,
        oi.quantity as order_item_quantity
      FROM public.reviews r
      LEFT JOIN public.products p ON r.product_id = p.id
      LEFT JOIN public.users u ON r.user_id = u.id
      LEFT JOIN public.orders o ON r.order_id = o.id
      LEFT JOIN public.order_items oi ON r.order_item_id = oi.id
      WHERE r.id = $1
    `;

    const sql = getDb(c);
    const reviewResult = await sql.unsafe(reviewQuery, [id]);

    if (reviewResult.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    const review = reviewResult[0];

    // Get review images
    const imagesQuery = `
      SELECT 
        ri.media_id,
        ri.display_order,
        m.filename,
        m.file_url as url,
        m.alt_text
      FROM public.review_images ri
      LEFT JOIN public.media m ON ri.media_id = m.id
      WHERE ri.review_id = $1
      ORDER BY ri.display_order
    `;

    const images = await sql.unsafe(imagesQuery, [id]);

    return c.json({
      ...review,
      images,
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return c.json({ error: "Failed to fetch review" }, 500);
  }
});

// PATCH /api/admin/reviews/:id - Update review (moderation)
reviewsRoutes.patch("/:id", adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const {
      status,
      moderation_status,
      moderation_notes,
      admin_response,
      admin_response_date,
      // Inline edit fields
      rating,
      comment,
      created_at,
    } = body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (moderation_status !== undefined) {
      updateFields.push(`moderation_status = $${paramIndex}`);
      params.push(moderation_status);
      paramIndex++;
    }

    if (moderation_notes !== undefined) {
      updateFields.push(`moderation_notes = $${paramIndex}`);
      params.push(moderation_notes);
      paramIndex++;
    }

    if (admin_response !== undefined) {
      updateFields.push(`admin_response = $${paramIndex}`);
      params.push(admin_response);
      paramIndex++;
    }

    if (admin_response_date !== undefined) {
      updateFields.push(`admin_response_date = $${paramIndex}`);
      params.push(admin_response_date);
      paramIndex++;
    }

    // Allow admins to inline-edit rating/comment/created_at
    if (rating !== undefined) {
      updateFields.push(`rating = $${paramIndex}`);
      params.push(Number(rating));
      paramIndex++;
    }

    if (comment !== undefined) {
      updateFields.push(`comment = $${paramIndex}`);
      params.push(comment);
      paramIndex++;
    }

    if (created_at !== undefined) {
      updateFields.push(`created_at = $${paramIndex}`);
      params.push(created_at);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const updateQuery = `
      UPDATE public.reviews 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const sql = getDb(c);
    const result = await sql.unsafe(updateQuery, params);

    if (result.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error("Error updating review:", error);
    return c.json({ error: "Failed to update review" }, 500);
  }
});

// DELETE /api/admin/reviews/:id - Delete review
reviewsRoutes.delete("/:id", adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();

    const deleteQuery = `
      DELETE FROM public.reviews 
      WHERE id = $1
      RETURNING id
    `;

    const sql = getDb(c);
    const result = await sql.unsafe(deleteQuery, [id]);

    if (result.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    return c.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return c.json({ error: "Failed to delete review" }, 500);
  }
});

// POST /api/admin/reviews/:id/approve - Approve review
reviewsRoutes.post("/:id/approve", adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();

    const updateQuery = `
      UPDATE public.reviews 
      SET status = 'approved', moderation_status = 'approved', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const sql = getDb(c);
    const result = await sql.unsafe(updateQuery, [id]);

    if (result.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error("Error approving review:", error);
    return c.json({ error: "Failed to approve review" }, 500);
  }
});

// POST /api/admin/reviews/:id/reject - Reject review
reviewsRoutes.post("/:id/reject", adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { moderation_notes } = body;

    const updateQuery = `
      UPDATE public.reviews 
      SET status = 'rejected', moderation_status = 'rejected', moderation_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const sql = getDb(c);
    const result = await sql.unsafe(updateQuery, [id, moderation_notes]);

    if (result.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error("Error rejecting review:", error);
    return c.json({ error: "Failed to reject review" }, 500);
  }
});

// POST /api/admin/reviews/:id/response - Add admin response
reviewsRoutes.post("/:id/response", adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { admin_response } = body;

    if (!admin_response) {
      return c.json({ error: "Admin response is required" }, 400);
    }

    const updateQuery = `
      UPDATE public.reviews 
      SET admin_response = $2, admin_response_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const sql = getDb(c);
    const result = await sql.unsafe(updateQuery, [id, admin_response]);

    if (result.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error("Error adding admin response:", error);
    return c.json({ error: "Failed to add admin response" }, 500);
  }
});

// GET /api/admin/reviews/analytics - Review analytics (consolidated)
/* DUPLICATE REMOVED - see consolidated handler earlier in file */
/*
reviewsRoutes.get("/analytics", adminMiddleware, async (c) => {
  try {
    const url = new URL(c.req.url);
    const productId = url.searchParams.get("product_id") || "";
    let dateFrom = url.searchParams.get("date_from") || "";
    let dateTo = url.searchParams.get("date_to") || "";
    // Support period/timeRange shorthands: 7d, 30d, 90d, 1y, all
    const period =
      url.searchParams.get("period") || url.searchParams.get("timeRange") || "";

    if (period && !dateFrom && !dateTo) {
      // Compute dateFrom based on period
      const now = new Date();
      const toIso = (d: Date) => d.toISOString();
      dateTo = toIso(now);
      const from = new Date(now);
      switch (period) {
        case "7d":
          from.setDate(now.getDate() - 7);
          break;
        case "30d":
          from.setDate(now.getDate() - 30);
          break;
        case "90d":
          from.setDate(now.getDate() - 90);
          break;
        case "1y":
          from.setFullYear(now.getFullYear() - 1);
          break;
        case "all":
        default:
          // leave dateFrom empty to include all
          dateFrom = "";
          dateTo = "";
      }
      if (period !== "all") {
        dateFrom = toIso(from);
      }
    }

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

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

    // Get review statistics and analytics matching frontend shape
    const statsQuery = `
      SELECT 
        COUNT(*)::int as total_reviews,
        COALESCE(AVG(rating), 0)::float as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::int as five_star_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::int as four_star_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::int as three_star_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::int as two_star_count,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::int as one_star_count,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END)::int as verified_reviews_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::int as approved_reviews_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_reviews_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int as rejected_reviews_count,
        COUNT(CASE WHEN admin_response IS NOT NULL THEN 1 END)::int as responded_reviews_count,
        COALESCE(SUM(helpful_count), 0)::int as total_helpful_votes
      FROM public.reviews r
      ${whereClause}
    `;

    const sql = getDb(c);
    const stats = (await sql.unsafe(statsQuery, params))[0];

    // With images percentage
    const imagesCountQuery = `
      SELECT COUNT(DISTINCT ri.review_id)::int AS with_images
      FROM public.review_images ri
      JOIN public.reviews r ON r.id = ri.review_id
      ${whereClause}
    `;
    const withImagesRow = (await sql.unsafe(imagesCountQuery, params))[0] || {
      with_images: 0,
    };

    // Top products
    const topProductsQuery = `
      SELECT r.product_id, p.name as product_name, COUNT(*)::int as review_count, COALESCE(AVG(r.rating),0)::float as average_rating
      FROM public.reviews r
      JOIN public.products p ON p.id = r.product_id
      ${whereClause}
      GROUP BY r.product_id, p.name
      ORDER BY review_count DESC
      LIMIT 5
    `;
    const topProducts = await sql.unsafe(topProductsQuery, params);

    // Top reviewers
    const topReviewersQuery = `
      SELECT r.user_id, u.email as user_email, COUNT(*)::int as review_count, COALESCE(AVG(r.rating),0)::float as average_rating
      FROM public.reviews r
      LEFT JOIN public.users u ON u.id = r.user_id
      ${whereClause}
      GROUP BY r.user_id, u.email
      ORDER BY review_count DESC
      LIMIT 5
    `;
    const topReviewers = await sql.unsafe(topReviewersQuery, params);

    // Monthly trends (last 6 buckets within filter)
    const monthlyTrendsQuery = `
      SELECT to_char(date_trunc('month', r.created_at), 'YYYY-MM') as month,
             COUNT(*)::int as reviews_count,
             COALESCE(AVG(r.rating),0)::float as average_rating
      FROM public.reviews r
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6
    `;
    const monthlyTrendsDesc = await sql.unsafe(monthlyTrendsQuery, params);
    const monthlyTrends = [...monthlyTrendsDesc].reverse();

    const total = Number(stats.total_reviews || 0);
    const approvalRate =
      total > 0 ? (Number(stats.approved_reviews_count) / total) * 100 : 0;
    const verifiedPct =
      total > 0 ? (Number(stats.verified_reviews_count) / total) * 100 : 0;
    const withImagesPct =
      total > 0 ? (Number(withImagesRow.with_images) / total) * 100 : 0;
    const withAdminRespPct =
      total > 0 ? (Number(stats.responded_reviews_count) / total) * 100 : 0;

    // Build rating distribution object as strings "1".."5"
    const rating_distribution = {
      "1": Number(stats.one_star_count || 0),
      "2": Number(stats.two_star_count || 0),
      "3": Number(stats.three_star_count || 0),
      "4": Number(stats.four_star_count || 0),
      "5": Number(stats.five_star_count || 0),
    } as const;

    const status_distribution = {
      pending: Number(stats.pending_reviews_count || 0),
      approved: Number(stats.approved_reviews_count || 0),
      rejected: Number(stats.rejected_reviews_count || 0),
    } as const;

    return c.json({
      total_reviews: total,
      average_rating: Number(stats.average_rating || 0),
      approval_rate: approvalRate,
      total_helpful_votes: Number(stats.total_helpful_votes || 0),
      rating_distribution,
      status_distribution,
      verified_purchase_percentage: verifiedPct,
      with_images_percentage: withImagesPct,
      with_admin_response_percentage: withAdminRespPct,
      top_products: topProducts,
      top_reviewers: topReviewers,
      monthly_trends: monthlyTrends,
    });
  } catch (error) {
    console.error("Error fetching review analytics:", error);
    return c.json({ error: "Failed to fetch review analytics" }, 500);
  }
});
*/

export default reviewsRoutes;

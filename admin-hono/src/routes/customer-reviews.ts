import { Hono } from "hono";
import { getDb } from "../lib/db";

const customerReviews = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// =====================================================
// CUSTOMER-FACING REVIEW API ROUTES
// =====================================================

// GET /api/customer/reviews/product/:productId - Get reviews for a specific product
customerReviews.get("/product/:productId", async (c) => {
  try {
    const { productId } = c.req.param();
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "10");
    const rating = url.searchParams.get("rating") || "";
    const sort = url.searchParams.get("sort") || "newest";
    const verifiedOnly = url.searchParams.get("verified_only") === "true";
    const offset = (page - 1) * perPage;

    const sql = getDb(c);

    // Build WHERE conditions
    const conditions: string[] = ["r.product_id = $1", "r.status = 'approved'"];
    const params: any[] = [productId];
    let paramIndex = 2;

    if (rating && rating !== "all") {
      conditions.push(`r.rating = $${paramIndex}`);
      params.push(parseInt(rating));
      paramIndex++;
    }

    if (verifiedOnly) {
      conditions.push(`r.is_verified_purchase = true`);
    }

    const whereClause = conditions.join(" AND ");

    // Sort options
    let orderBy = "r.created_at DESC";
    switch (sort) {
      case "oldest":
        orderBy = "r.created_at ASC";
        break;
      case "highest_rating":
        orderBy = "r.rating DESC, r.created_at DESC";
        break;
      case "lowest_rating":
        orderBy = "r.rating ASC, r.created_at DESC";
        break;
      case "most_helpful":
        orderBy = "r.helpful_count DESC, r.created_at DESC";
        break;
      default:
        orderBy = "r.created_at DESC";
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM public.reviews r
      WHERE ${whereClause}
    `;
    const countResult = await sql.unsafe(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get reviews with pagination
    const reviewsQuery = `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.is_verified_purchase,
        r.helpful_count,
        r.admin_response,
        r.admin_response_date,
        r.reviewer_name,
        r.reviewer_email,
        u.name as user_name,
        o.order_number,
        -- Count review images
        (SELECT COUNT(*) FROM public.review_images ri WHERE ri.review_id = r.id) as image_count
      FROM public.reviews r
      LEFT JOIN public.users u ON r.user_id = u.id
      LEFT JOIN public.orders o ON r.order_id = o.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(perPage, offset);
    const reviews = await sql.unsafe(reviewsQuery, params);

    // Get review images for each review
    const reviewsWithImages = await Promise.all(
      reviews.map(async (review) => {
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
        const images = await sql.unsafe(imagesQuery, [review.id]);
        return {
          ...review,
          images,
        };
      })
    );

    return c.json({
      data: reviewsWithImages,
      meta: {
        current_page: page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
        total_items: total,
      },
    });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return c.json({ error: "Failed to fetch product reviews" }, 500);
  }
});

// GET /api/customer/reviews/product/:productId/stats - Get review statistics for a product
customerReviews.get("/product/:productId/stats", async (c) => {
  try {
    const { productId } = c.req.param();
    const sql = getDb(c);

    const statsQuery = `
      SELECT 
        COUNT(*)::int as total_reviews,
        COALESCE(AVG(rating), 0)::float as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END)::int as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END)::int as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END)::int as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END)::int as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END)::int as one_star,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END)::int as verified_purchases
      FROM public.reviews r
      WHERE r.product_id = $1 AND r.status = 'approved'
    `;

    const stats = await sql.unsafe(statsQuery, [productId]);

    return c.json({
      ...stats[0],
      rating_distribution: {
        "5": stats[0].five_star,
        "4": stats[0].four_star,
        "3": stats[0].three_star,
        "2": stats[0].two_star,
        "1": stats[0].one_star,
      },
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return c.json({ error: "Failed to fetch review stats" }, 500);
  }
});

// POST /api/customer/reviews - Submit a new review
customerReviews.post("/", async (c) => {
  try {
    const sql = getDb(c);
    const body = await c.req.json();

    const {
      product_id,
      user_id,
      order_id,
      order_item_id,
      rating,
      title,
      comment,
      reviewer_name,
      reviewer_email,
      is_verified_purchase = false,
    } = body;

    // Validation
    if (!product_id || !rating || !comment) {
      return c.json(
        { error: "product_id, rating, and comment are required" },
        400
      );
    }

    if (rating < 1 || rating > 5) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    // Check if user already reviewed this product (if user_id provided)
    if (user_id) {
      const existingReview = await sql.unsafe(
        `SELECT id FROM public.reviews WHERE product_id = $1 AND user_id = $2`,
        [product_id, user_id]
      );

      if (existingReview.length > 0) {
        return c.json({ error: "You have already reviewed this product" }, 409);
      }
    }

    // Insert review
    const reviewQuery = `
      INSERT INTO public.reviews (
        product_id, user_id, order_id, order_item_id, rating, title, comment,
        reviewer_name, reviewer_email, is_verified_purchase, status, review_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11
      )
      RETURNING id, product_id, rating, title, comment, status, created_at
    `;

    const reviewType = user_id ? "user" : "guest";
    const result = await sql.unsafe(reviewQuery, [
      product_id,
      user_id || null,
      order_id || null,
      order_item_id || null,
      rating,
      title || null,
      comment,
      reviewer_name || null,
      reviewer_email || null,
      is_verified_purchase,
      reviewType,
    ]);

    return c.json({
      ...result[0],
      message: "Review submitted successfully and is pending approval",
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return c.json({ error: "Failed to submit review" }, 500);
  }
});

// POST /api/customer/reviews/:reviewId/images - Add images to a review
customerReviews.post("/:reviewId/images", async (c) => {
  try {
    const { reviewId } = c.req.param();
    const sql = getDb(c);
    const body = await c.req.json();

    const { media_id, display_order = 0 } = body;

    if (!media_id) {
      return c.json({ error: "media_id is required" }, 400);
    }

    // Verify review exists
    const reviewExists = await sql.unsafe(
      `SELECT id FROM public.reviews WHERE id = $1`,
      [reviewId]
    );

    if (reviewExists.length === 0) {
      return c.json({ error: "Review not found" }, 404);
    }

    // Verify media exists and is review image type
    const mediaExists = await sql.unsafe(
      `SELECT id FROM public.media WHERE id = $1 AND media_type = 'review_image'`,
      [media_id]
    );

    if (mediaExists.length === 0) {
      return c.json({ error: "Media not found or invalid type" }, 404);
    }

    // Insert review image association
    const insertQuery = `
      INSERT INTO public.review_images (review_id, media_id, display_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (review_id, media_id) DO UPDATE SET display_order = EXCLUDED.display_order
      RETURNING review_id, media_id, display_order
    `;

    const result = await sql.unsafe(insertQuery, [
      reviewId,
      media_id,
      display_order,
    ]);

    return c.json(result[0]);
  } catch (error) {
    console.error("Error adding review image:", error);
    return c.json({ error: "Failed to add review image" }, 500);
  }
});

// GET /api/customer/reviews/user/:userId - Get reviews by a specific user
customerReviews.get("/user/:userId", async (c) => {
  try {
    const { userId } = c.req.param();
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "10");
    const status = url.searchParams.get("status") || "all";
    const offset = (page - 1) * perPage;

    const sql = getDb(c);

    // Build WHERE conditions
    const conditions: string[] = ["r.user_id = $1"];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status !== "all") {
      conditions.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM public.reviews r
      WHERE ${whereClause}
    `;
    const countResult = await sql.unsafe(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get reviews with pagination
    const reviewsQuery = `
      SELECT 
        r.id,
        r.product_id,
        r.rating,
        r.title,
        r.comment,
        r.status,
        r.created_at,
        r.updated_at,
        r.is_verified_purchase,
        r.helpful_count,
        r.admin_response,
        r.admin_response_date,
        p.name as product_name,
        p.slug as product_slug,
        o.order_number,
        oi.product_name as order_item_name,
        -- Count review images
        (SELECT COUNT(*) FROM public.review_images ri WHERE ri.review_id = r.id) as image_count
      FROM public.reviews r
      LEFT JOIN public.products p ON r.product_id = p.id
      LEFT JOIN public.orders o ON r.order_id = o.id
      LEFT JOIN public.order_items oi ON r.order_item_id = oi.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(perPage, offset);
    const reviews = await sql.unsafe(reviewsQuery, params);

    // Get review images for each review
    const reviewsWithImages = await Promise.all(
      reviews.map(async (review) => {
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
        const images = await sql.unsafe(imagesQuery, [review.id]);
        return {
          ...review,
          images,
        };
      })
    );

    return c.json({
      data: reviewsWithImages,
      meta: {
        current_page: page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
        total_items: total,
      },
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return c.json({ error: "Failed to fetch user reviews" }, 500);
  }
});

// POST /api/customer/reviews/:reviewId/helpful - Mark review as helpful/not helpful
customerReviews.post("/:reviewId/helpful", async (c) => {
  try {
    const { reviewId } = c.req.param();
    const sql = getDb(c);
    const body = await c.req.json();

    const { user_id, is_helpful = true, ip_address } = body;

    if (!user_id && !ip_address) {
      return c.json({ error: "user_id or ip_address is required" }, 400);
    }

    // Check if user/IP already voted
    let existingVoteQuery = `
      SELECT id FROM public.review_helpful_votes 
      WHERE review_id = $1
    `;
    const existingParams = [reviewId];

    if (user_id) {
      existingVoteQuery += ` AND user_id = $2`;
      existingParams.push(user_id);
    } else {
      existingVoteQuery += ` AND ip_address = $2`;
      existingParams.push(ip_address);
    }

    const existingVote = await sql.unsafe(existingVoteQuery, existingParams);

    if (existingVote.length > 0) {
      // Update existing vote
      const updateQuery = `
        UPDATE public.review_helpful_votes 
        SET is_helpful = $1, created_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, is_helpful
      `;
      const result = await sql.unsafe(updateQuery, [
        is_helpful,
        existingVote[0].id,
      ]);
      return c.json(result[0]);
    } else {
      // Insert new vote
      const insertQuery = `
        INSERT INTO public.review_helpful_votes (review_id, user_id, ip_address, is_helpful)
        VALUES ($1, $2, $3, $4)
        RETURNING id, is_helpful
      `;
      const result = await sql.unsafe(insertQuery, [
        reviewId,
        user_id || null,
        ip_address || null,
        is_helpful,
      ]);
      return c.json(result[0]);
    }
  } catch (error) {
    console.error("Error voting on review:", error);
    return c.json({ error: "Failed to vote on review" }, 500);
  }
});

// POST /api/customer/reviews/upload-image - Upload review image (integrates with media management)
customerReviews.post("/upload-image", async (c) => {
  try {
    const sql = getDb(c);
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const altText = (formData.get("alt_text") as string) || "";

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        400
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ error: "File size must be less than 5MB" }, 400);
    }

    // Generate file path for review images
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `review_${timestamp}.${extension}`;
    const filePath = `uploads/reviews/${year}/${month}/${filename}`;

    // Here you would implement the actual file upload to your storage (R2, S3, etc.)
    // For now, we'll just create a mock URL
    const fileUrl = `https://your-storage-domain.com/${filePath}`;

    // Insert into media table
    const mediaQuery = `
      INSERT INTO public.media (
        filename, file_url, file_type, size, alt_text, media_type
      ) VALUES (
        $1, $2, $3, $4, $5, 'review_image'
      )
      RETURNING id, filename, file_url, file_type, size, alt_text, media_type, created_at
    `;

    const result = await sql.unsafe(mediaQuery, [
      filename,
      fileUrl,
      file.type,
      file.size,
      altText,
    ]);

    return c.json({
      ...result[0],
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading review image:", error);
    return c.json({ error: "Failed to upload image" }, 500);
  }
});

// DELETE /api/customer/reviews/:reviewId/helpful - Remove helpful vote
customerReviews.delete("/:reviewId/helpful", async (c) => {
  try {
    const { reviewId } = c.req.param();
    const sql = getDb(c);
    const body = await c.req.json().catch(() => ({}));

    const { user_id, ip_address } = body;

    if (!user_id && !ip_address) {
      return c.json({ error: "user_id or ip_address is required" }, 400);
    }

    // Delete existing vote
    let deleteQuery = `
      DELETE FROM public.review_helpful_votes 
      WHERE review_id = $1
    `;
    const deleteParams = [reviewId];

    if (user_id) {
      deleteQuery += ` AND user_id = $2`;
      deleteParams.push(user_id);
    } else {
      deleteQuery += ` AND ip_address = $2`;
      deleteParams.push(ip_address);
    }

    deleteQuery += ` RETURNING id`;

    const result = await sql.unsafe(deleteQuery, deleteParams);

    if (result.length === 0) {
      return c.json({ error: "Vote not found" }, 404);
    }

    return c.json({ message: "Vote removed successfully" });
  } catch (error) {
    console.error("Error removing helpful vote:", error);
    return c.json({ error: "Failed to remove vote" }, 500);
  }
});

export default customerReviews;

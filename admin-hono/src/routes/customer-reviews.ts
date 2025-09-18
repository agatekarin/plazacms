import { Hono } from 'hono';
import { getDb } from '../lib/db';

const customerReviewsRoutes = new Hono<{ Bindings: Env }>();

// =====================================================
// CUSTOMER REVIEW API ROUTES
// =====================================================

// GET /api/reviews/product/:productId - Get product reviews
customerReviewsRoutes.get('/product/:productId', async (c) => {
  try {
    const { productId } = c.req.param();
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const rating = url.searchParams.get('rating') || '';
    const verifiedOnly = url.searchParams.get('verified_only') === 'true';
    const hasImages = url.searchParams.get('has_images') === 'true';
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ['r.product_id = $1', 'r.status = \'approved\''];
    const params: any[] = [productId];
    let paramIndex = 2;

    if (rating) {
      conditions.push(`r.rating = $${paramIndex}`);
      params.push(parseInt(rating));
      paramIndex++;
    }

    if (verifiedOnly) {
      conditions.push(`r.is_verified_purchase = true`);
    }

    if (hasImages) {
      conditions.push(`EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = r.id)`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Build ORDER BY clause
    let orderBy = `r.${sortBy}`;
    if (sortBy === 'helpful') {
      orderBy = 'r.helpful_count';
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM public.reviews r
      ${whereClause}
    `;
    
    const sql = getDb(c);
    const countResult = await sql.unsafe(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0');

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
        u.name as user_name,
        u.email as user_email,
        -- Aggregate review images
        COALESCE(
          json_agg(
            json_build_object(
              'media_id', ri.media_id,
              'display_order', ri.display_order,
              'url', m.url,
              'alt_text', m.alt_text
            ) ORDER BY ri.display_order
          ) FILTER (WHERE ri.media_id IS NOT NULL), 
          '[]'::json
        ) as images
      FROM public.reviews r
      LEFT JOIN public.users u ON r.user_id = u.id
      LEFT JOIN public.review_images ri ON r.id = ri.review_id
      LEFT JOIN public.media m ON ri.media_id = m.id
      ${whereClause}
      GROUP BY r.id, u.name, u.email
      ORDER BY ${orderBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const reviews = await sql.unsafe(reviewsQuery, params);

    // Get review statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END) as verified_reviews_count
      FROM public.reviews r
      WHERE r.product_id = $1 AND r.status = 'approved'
    `;

    const statsResult = await sql.unsafe(statsQuery, [productId]);
    const stats = statsResult[0];

    return c.json({
      reviews,
      stats: {
        total_reviews: parseInt(stats.total_reviews || '0'),
        average_rating: parseFloat(stats.average_rating || '0'),
        rating_distribution: [
          { rating: 5, count: parseInt(stats.five_star_count || '0') },
          { rating: 4, count: parseInt(stats.four_star_count || '0') },
          { rating: 3, count: parseInt(stats.three_star_count || '0') },
          { rating: 2, count: parseInt(stats.two_star_count || '0') },
          { rating: 1, count: parseInt(stats.one_star_count || '0') }
        ],
        verified_reviews_count: parseInt(stats.verified_reviews_count || '0')
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return c.json({ error: 'Failed to fetch product reviews' }, 500);
  }
});

// POST /api/reviews - Submit review
customerReviewsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      product_id,
      user_id,
      order_id,
      order_item_id,
      rating,
      comment,
      reviewer_name,
      reviewer_email,
      images = []
    } = body;

    // Validate required fields
    if (!product_id || !rating || rating < 1 || rating > 5) {
      return c.json({ error: 'Product ID and rating (1-5) are required' }, 400);
    }

    const sql = getDb(c);

    // Check if product exists
    const productCheck = await sql.unsafe(
      'SELECT id FROM public.products WHERE id = $1 AND status = \'published\'',
      [product_id]
    );

    if (productCheck.length === 0) {
      return c.json({ error: 'Product not found or not published' }, 404);
    }

    // Check if user exists (if provided)
    if (user_id) {
      const userCheck = await sql.unsafe(
        'SELECT id FROM public.users WHERE id = $1',
        [user_id]
      );

      if (userCheck.length === 0) {
        return c.json({ error: 'User not found' }, 404);
      }
    }

    // Check for existing review from same user for same product
    if (user_id) {
      const existingReview = await sql.unsafe(
        'SELECT id FROM public.reviews WHERE product_id = $1 AND user_id = $2',
        [product_id, user_id]
      );

      if (existingReview.length > 0) {
        return c.json({ error: 'You have already reviewed this product' }, 400);
      }
    }

    // Determine if this is a verified purchase
    let isVerifiedPurchase = false;
    if (user_id && order_id && order_item_id) {
      const orderCheck = await sql.unsafe(
        'SELECT oi.id FROM public.order_items oi JOIN public.orders o ON oi.order_id = o.id WHERE oi.id = $1 AND oi.order_id = $2 AND oi.product_id = $3 AND o.user_id = $4',
        [order_item_id, order_id, product_id, user_id]
      );

      isVerifiedPurchase = orderCheck.length > 0;
    }

    // Insert review
    const insertQuery = `
      INSERT INTO public.reviews (
        product_id, user_id, order_id, order_item_id, rating, comment,
        reviewer_name, reviewer_email, review_type, status, moderation_status,
        is_verified_purchase, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const reviewType = user_id ? 'user' : 'guest';
    const newReview = await sql.unsafe(insertQuery, [
      product_id,
      user_id,
      order_id,
      order_item_id,
      rating,
      comment,
      reviewer_name,
      reviewer_email,
      reviewType,
      'pending', // Default status for new reviews
      'pending', // Default moderation status
      isVerifiedPurchase
    ]);

    // Handle images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      for (const [index, mediaId] of images.entries()) {
        try {
          await sql.unsafe(
            'INSERT INTO public.review_images (review_id, media_id, display_order) VALUES ($1, $2, $3) ON CONFLICT (review_id, media_id) DO NOTHING',
            [newReview[0].id, mediaId, index + 1]
          );
        } catch (imageError) {
          console.error('Error adding review image:', imageError);
        }
      }
    }

    return c.json({
      message: 'Review submitted successfully',
      review: newReview[0]
    });

  } catch (error) {
    console.error('Error submitting review:', error);
    return c.json({ error: 'Failed to submit review' }, 500);
  }
});

// POST /api/reviews/:id/helpful - Vote helpful
customerReviewsRoutes.post('/:id/helpful', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { is_helpful, user_id, ip_address } = body;

    if (typeof is_helpful !== 'boolean') {
      return c.json({ error: 'is_helpful must be a boolean' }, 400);
    }

    const sql = getDb(c);

    // Check if review exists
    const reviewCheck = await sql.unsafe(
      'SELECT id FROM public.reviews WHERE id = $1 AND status = \'approved\'',
      [id]
    );

    if (reviewCheck.length === 0) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Check for existing vote
    const existingVote = await sql.unsafe(
      'SELECT id, is_helpful FROM public.review_helpful_votes WHERE review_id = $1 AND (user_id = $2 OR ip_address = $3)',
      [id, user_id, ip_address]
    );

    if (existingVote.length > 0) {
      // Update existing vote
      const updateQuery = `
        UPDATE public.review_helpful_votes 
        SET is_helpful = $2, created_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const updatedVote = await sql.unsafe(updateQuery, [existingVote[0].id, is_helpful]);
      return c.json({
        message: 'Vote updated successfully',
        vote: updatedVote[0]
      });
    } else {
      // Insert new vote
      const insertQuery = `
        INSERT INTO public.review_helpful_votes (review_id, user_id, ip_address, is_helpful)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const newVote = await sql.unsafe(insertQuery, [id, user_id, ip_address, is_helpful]);
      return c.json({
        message: 'Vote submitted successfully',
        vote: newVote[0]
      });
    }

  } catch (error) {
    console.error('Error voting on review:', error);
    return c.json({ error: 'Failed to vote on review' }, 500);
  }
});

// GET /api/reviews/orders/:orderId - Get reviewable items from order
customerReviewsRoutes.get('/orders/:orderId', async (c) => {
  try {
    const { orderId } = c.req.param();
    const url = new URL(c.req.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const sql = getDb(c);

    // Get order items that can be reviewed
    const reviewableItemsQuery = `
      SELECT 
        oi.id as order_item_id,
        oi.product_id,
        oi.product_name,
        oi.product_price,
        oi.quantity,
        p.name as product_name_from_catalog,
        p.slug as product_slug,
        p.featured_image_id,
        m.url as product_image_url,
        -- Check if already reviewed
        r.id as existing_review_id,
        r.rating as existing_rating,
        r.comment as existing_comment,
        r.created_at as review_created_at
      FROM public.order_items oi
      LEFT JOIN public.products p ON oi.product_id = p.id
      LEFT JOIN public.media m ON p.featured_image_id = m.id
      LEFT JOIN public.reviews r ON oi.id = r.order_item_id AND r.user_id = $2
      WHERE oi.order_id = $1
      ORDER BY oi.created_at DESC
    `;

    const reviewableItems = await sql.unsafe(reviewableItemsQuery, [orderId, userId]);

    return c.json({
      order_id: orderId,
      reviewable_items: reviewableItems
    });

  } catch (error) {
    console.error('Error fetching reviewable items:', error);
    return c.json({ error: 'Failed to fetch reviewable items' }, 500);
  }
});

export default customerReviewsRoutes;
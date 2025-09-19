import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const productAnalyticsRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// =====================================================
// PRODUCT ANALYTICS API ROUTES
// =====================================================

// GET /api/admin/products/analytics - Get comprehensive product analytics
productAnalyticsRoutes.get("/analytics", adminMiddleware, async (c) => {
  try {
    const sql = getDb(c);
    const url = new URL(c.req.url);
    let dateFrom = url.searchParams.get("date_from") || "";
    let dateTo = url.searchParams.get("date_to") || "";
    const period = url.searchParams.get("period") || "30d";

    // Set date range based on period
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

    if (dateFrom) {
      conditions.push(`p.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`p.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get product analytics
    const analyticsQuery = `
      SELECT 
        COUNT(*)::int as total_products,
        COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_count,
        COUNT(CASE WHEN stock <= 0 THEN 1 END)::int as out_of_stock_count,
        COALESCE(AVG(regular_price), 0)::float as average_price,
        COALESCE(SUM(stock), 0)::int as total_stock,
        COALESCE(SUM(CASE WHEN sale_price IS NOT NULL THEN 1 ELSE 0 END), 0)::int as on_sale_count,
        COALESCE(MAX(regular_price), 0)::float as max_price,
        COALESCE(MIN(CASE WHEN regular_price > 0 THEN regular_price END), 0)::float as min_price
      FROM public.products p
      ${whereClause}
    `;

    const analytics = (await sql.unsafe(analyticsQuery, params))[0];

    // Get monthly trends
    const monthlyTrendsQuery = `
      SELECT 
        to_char(date_trunc('month', p.created_at), 'YYYY-MM') as month,
        COUNT(*)::int as products_count,
        COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published_count,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_count,
        COALESCE(AVG(regular_price), 0)::float as average_price
      FROM public.products p
      ${whereClause}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 12
    `;
    const monthlyTrendsDesc = await sql.unsafe(monthlyTrendsQuery, params);
    const monthlyTrends = [...monthlyTrendsDesc].reverse();

    // Get category distribution
    const categoryQuery = `
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COUNT(p.id)::int as product_count,
        COALESCE(AVG(p.regular_price), 0)::float as average_price,
        COALESCE(SUM(p.stock), 0)::int as total_stock
      FROM public.products p
      LEFT JOIN public.categories c ON c.id = p.category_id
      ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY product_count DESC
      LIMIT 10
    `;
    const categoryDistribution = await sql.unsafe(categoryQuery, params);

    // Get price range distribution
    const priceRangeQuery = `
      SELECT 
        CASE 
          WHEN regular_price < 10 THEN 'Under $10'
          WHEN regular_price < 50 THEN '$10-$49'
          WHEN regular_price < 100 THEN '$50-$99'
          WHEN regular_price < 500 THEN '$100-$499'
          ELSE '$500+'
        END as price_range,
        COUNT(*)::int as product_count
      FROM public.products p
      ${whereClause}
      GROUP BY 1
      ORDER BY MIN(regular_price)
    `;
    const priceDistribution = await sql.unsafe(priceRangeQuery, params);

    // Get inventory status
    const inventoryQuery = `
      SELECT 
        CASE 
          WHEN stock = 0 THEN 'Out of Stock'
          WHEN stock <= 10 THEN 'Low Stock'
          WHEN stock <= 50 THEN 'Medium Stock'
          ELSE 'High Stock'
        END as stock_status,
        COUNT(*)::int as product_count,
        COALESCE(SUM(stock), 0)::int as total_stock
      FROM public.products p
      ${whereClause}
      GROUP BY 
        CASE 
          WHEN stock = 0 THEN 'Out of Stock'
          WHEN stock <= 10 THEN 'Low Stock'
          WHEN stock <= 50 THEN 'Medium Stock'
          ELSE 'High Stock'
        END
      ORDER BY 
        MIN(CASE 
          WHEN stock = 0 THEN 1
          WHEN stock <= 10 THEN 2
          WHEN stock <= 50 THEN 3
          ELSE 4
        END)
    `;
    const inventoryStatus = await sql.unsafe(inventoryQuery, params);

    // Get top selling products (if orders exist)
    const topProductsQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.slug,
        COALESCE(SUM(oi.quantity), 0)::int as total_sold,
        COALESCE(SUM(oi.quantity * oi.product_price), 0)::float as total_revenue,
        COUNT(DISTINCT o.id)::int as order_count
      FROM public.products p
      LEFT JOIN public.order_items oi ON oi.product_id = p.id
      LEFT JOIN public.orders o ON o.id = oi.order_id
      ${whereClause.replace(
        "p.created_at",
        "COALESCE(o.created_at, p.created_at)"
      )}
      GROUP BY p.id, p.name, p.slug
      ORDER BY total_sold DESC
      LIMIT 10
    `;
    const topProducts = await sql.unsafe(topProductsQuery, params);

    // Get products with most views (if view tracking exists)
    const mostViewedQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.slug,
        p.stock,
        p.regular_price,
        p.status
      FROM public.products p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    const recentProducts = await sql.unsafe(mostViewedQuery, params);

    // Calculate percentages
    const total = Number(analytics.total_products || 0);
    const publishedRate =
      total > 0 ? (Number(analytics.published_count) / total) * 100 : 0;
    const outOfStockRate =
      total > 0 ? (Number(analytics.out_of_stock_count) / total) * 100 : 0;
    const onSaleRate =
      total > 0 ? (Number(analytics.on_sale_count) / total) * 100 : 0;
    const draftRate =
      total > 0 ? (Number(analytics.draft_count) / total) * 100 : 0;

    // Status distribution
    const status_distribution = {
      published: Number(analytics.published_count || 0),
      draft: Number(analytics.draft_count || 0),
      out_of_stock: Number(analytics.out_of_stock_count || 0),
    };

    return c.json({
      summary: {
        total_products: total,
        published_products: Number(analytics.published_count || 0),
        draft_products: Number(analytics.draft_count || 0),
        out_of_stock_products: Number(analytics.out_of_stock_count || 0),
        average_price: Number(analytics.average_price || 0),
        max_price: Number(analytics.max_price || 0),
        min_price: Number(analytics.min_price || 0),
        total_stock: Number(analytics.total_stock || 0),
        on_sale_products: Number(analytics.on_sale_count || 0),
      },
      rates: {
        published_rate: publishedRate,
        draft_rate: draftRate,
        out_of_stock_rate: outOfStockRate,
        on_sale_rate: onSaleRate,
      },
      distributions: {
        status: status_distribution,
        category: categoryDistribution,
        price_range: priceDistribution,
        inventory: inventoryStatus,
      },
      trends: {
        monthly: monthlyTrends,
      },
      top_lists: {
        best_selling: topProducts,
        recent_products: recentProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching product analytics:", error);
    return c.json({ error: "Failed to fetch product analytics" }, 500);
  }
});

export default productAnalyticsRoutes;

import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

const productImportExportRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: any };
}>();

// =====================================================
// PRODUCT IMPORT/EXPORT API ROUTES
// =====================================================

// GET /api/admin/products/import-export/stats - Get import/export statistics
productImportExportRoutes.get(
  "/import-export/stats",
  adminMiddleware,
  async (c) => {
    try {
      const sql = getDb(c);

      // Get total products count
      const totalQuery = `
      SELECT COUNT(*)::int as total_products
      FROM public.products
    `;
      const totalResult = await sql.unsafe(totalQuery, []);
      const totalProducts = totalResult[0]?.total_products || 0;

      // Get published products count
      const publishedQuery = `
      SELECT COUNT(*)::int as published_products
      FROM public.products
      WHERE status = 'published'
    `;
      const publishedResult = await sql.unsafe(publishedQuery, []);
      const publishedProducts = publishedResult[0]?.published_products || 0;

      // Get draft products count
      const draftQuery = `
      SELECT COUNT(*)::int as draft_products
      FROM public.products
      WHERE status = 'draft'
    `;
      const draftResult = await sql.unsafe(draftQuery, []);
      const draftProducts = draftResult[0]?.draft_products || 0;

      // Get products with images count
      const withImagesQuery = `
      SELECT COUNT(DISTINCT p.id)::int as products_with_images
      FROM public.products p
      INNER JOIN public.product_images pi ON p.id = pi.product_id
    `;
      const withImagesResult = await sql.unsafe(withImagesQuery, []);
      const productsWithImages = withImagesResult[0]?.products_with_images || 0;

      // Get products with variants count
      const withVariantsQuery = `
      SELECT COUNT(DISTINCT p.id)::int as products_with_variants
      FROM public.products p
      INNER JOIN public.product_variants pv ON p.id = pv.product_id
    `;
      const withVariantsResult = await sql.unsafe(withVariantsQuery, []);
      const productsWithVariants =
        withVariantsResult[0]?.products_with_variants || 0;

      // Get total variants count
      const totalVariantsQuery = `
      SELECT COUNT(*)::int as total_variants
      FROM public.product_variants
    `;
      const totalVariantsResult = await sql.unsafe(totalVariantsQuery, []);
      const totalVariants = totalVariantsResult[0]?.total_variants || 0;

      // Get out of stock products count
      const outOfStockQuery = `
      SELECT COUNT(*)::int as out_of_stock_products
      FROM public.products
      WHERE stock <= 0
    `;
      const outOfStockResult = await sql.unsafe(outOfStockQuery, []);
      const outOfStockProducts =
        outOfStockResult[0]?.out_of_stock_products || 0;

      // Get products on sale count
      const onSaleQuery = `
      SELECT COUNT(*)::int as on_sale_products
      FROM public.products
      WHERE sale_price IS NOT NULL 
        AND (sale_start_date IS NULL OR sale_start_date <= NOW()) 
        AND (sale_end_date IS NULL OR sale_end_date >= NOW())
    `;
      const onSaleResult = await sql.unsafe(onSaleQuery, []);
      const onSaleProducts = onSaleResult[0]?.on_sale_products || 0;

      // Get average product price
      const avgPriceQuery = `
      SELECT COALESCE(AVG(regular_price), 0)::float as average_price
      FROM public.products
      WHERE regular_price > 0
    `;
      const avgPriceResult = await sql.unsafe(avgPriceQuery, []);
      const averagePrice = avgPriceResult[0]?.average_price || 0;

      // Get categories count
      const categoriesQuery = `
      SELECT COUNT(DISTINCT category_id)::int as categories_count
      FROM public.products
      WHERE category_id IS NOT NULL
    `;
      const categoriesResult = await sql.unsafe(categoriesQuery, []);
      const categoriesCount = categoriesResult[0]?.categories_count || 0;

      // TODO: Add last_export_date and last_import_date tracking
      // For now, return mock data
      return c.json({
        total_products: totalProducts,
        published_products: publishedProducts,
        draft_products: draftProducts,
        products_with_images: productsWithImages,
        products_with_variants: productsWithVariants,
        total_variants: totalVariants,
        out_of_stock_products: outOfStockProducts,
        on_sale_products: onSaleProducts,
        average_price: averagePrice,
        categories_count: categoriesCount,
        last_export_date: null,
        last_import_date: null,
      });
    } catch (error) {
      console.error("Error fetching product import/export stats:", error);
      return c.json({ error: "Failed to fetch stats" }, 500);
    }
  }
);

export default productImportExportRoutes;

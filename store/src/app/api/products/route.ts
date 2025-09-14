import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  regular_price: string;
  sale_price: string | null;
  currency: string;
  featured_image_url: string | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const category = url.searchParams.get("category");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 12), 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const params: unknown[] = [];
    let where = "WHERE status = 'published'";
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (name ILIKE $${params.length} OR slug ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      where += ` AND category_id = $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const query = `
      SELECT p.id, p.name, p.slug, p.regular_price::text AS regular_price,
             p.sale_price::text AS sale_price, p.currency,
             COALESCE(m.file_url, NULL) AS featured_image_url
      FROM products p
      LEFT JOIN media m ON m.id = p.featured_image_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query<DbProduct>(query, params);
    return NextResponse.json({ items: rows, limit, offset });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

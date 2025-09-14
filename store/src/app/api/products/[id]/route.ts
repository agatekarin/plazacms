import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type DbProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  regular_price: string;
  sale_price: string | null;
  currency: string;
  stock: number;
  featured_image_url: string | null;
};

export async function GET(req: Request, context: { params: { id: string } }) {
  const { params } = await context;
  const { id } = params;

  try {
    const query = `
      SELECT p.id, p.name, p.slug, p.description,
             p.regular_price::text AS regular_price,
             p.sale_price::text AS sale_price,
             p.currency, p.stock,
             COALESCE(m.file_url, NULL) AS featured_image_url
      FROM products p
      LEFT JOIN media m ON m.id = p.featured_image_id
      WHERE p.id = $1 AND p.status = 'published'
      LIMIT 1
    `;
    const { rows } = await db.query<DbProductDetail>(query, [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

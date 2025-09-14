import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const { params } = await context;
  const productId = params.id;
  if (!productId)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const optionsSql = `
      WITH vals AS (
        SELECT DISTINCT pa.id AS attribute_id, pav.id, pav.value
          FROM product_attributes pa
          JOIN product_attribute_values pav ON pav.attribute_id = pa.id
          JOIN product_variant_attribute_values vv ON vv.attribute_value_id = pav.id
          JOIN product_variants v ON v.id = vv.product_variant_id
         WHERE v.product_id = $1 AND v.status = 'published'
      )
      SELECT pa.id AS attribute_id, pa.name,
             COALESCE(
               json_agg(json_build_object('id', vals.id, 'value', vals.value) ORDER BY vals.value), '[]'
             ) AS values
        FROM product_attributes pa
        JOIN vals ON vals.attribute_id = pa.id
       GROUP BY pa.id, pa.name
       ORDER BY pa.name`;

    const variantsSql = `
      SELECT v.id,
             v.sku,
             v.stock,
             COALESCE(v.sale_price, v.regular_price)::text AS price,
             (
               SELECT m.file_url FROM product_variant_images pvi
               JOIN media m ON m.id = pvi.media_id
               WHERE pvi.product_variant_id = v.id
               ORDER BY pvi.display_order ASC
               LIMIT 1
             ) AS image_url,
             COALESCE(ARRAY_AGG(vv.attribute_value_id ORDER BY vv.attribute_value_id), '{}') AS value_ids,
             COALESCE(
               json_agg(
                 json_build_object(
                   'attribute_id', pa.id,
                   'attribute_name', pa.name,
                   'value_id', pav.id,
                   'value', pav.value
                 )
                 ORDER BY pa.name
               ) FILTER (WHERE pav.id IS NOT NULL), '[]'
             ) AS attrs
        FROM product_variants v
        LEFT JOIN product_variant_attribute_values vv ON vv.product_variant_id = v.id
        LEFT JOIN product_attribute_values pav ON pav.id = vv.attribute_value_id
        LEFT JOIN product_attributes pa ON pa.id = pav.attribute_id
       WHERE v.product_id = $1 AND v.status = 'published'
       GROUP BY v.id
       ORDER BY v.created_at ASC`;

    const [optRes, varRes] = await Promise.all([
      db.query(optionsSql, [productId]),
      db.query(variantsSql, [productId]),
    ]);

    return NextResponse.json({ options: optRes.rows, variants: varRes.rows });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load variants" },
      { status: 500 }
    );
  }
}

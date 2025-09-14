// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev/api/admin/settings/general instead

import { NextResponse } from "next/server";
// import { auth } from "../../../../../lib/auth";
// import { pool } from "../../../../../lib/db";

// GET /api/admin/settings/general
export async function GET() {
  return NextResponse.json(
    {
      error:
        "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev/api/admin/settings/general instead",
    },
    { status: 410 }
  ); // 410 Gone

  // const session = await auth();
  // const role = session?.user && (session.user as any).role;
  // if (!session?.user || role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  /*
  try {
    const { rows } = await pool.query(`
      SELECT s.*,
             logo.file_url as logo_url, logo.alt_text as logo_alt,
             favicon.file_url as favicon_url, favicon.alt_text as favicon_alt,
             default_product.file_url as default_product_url, default_product.alt_text as default_product_alt,
             default_avatar.file_url as default_avatar_url, default_avatar.alt_text as default_avatar_alt,
             social_share.file_url as social_share_url, social_share.alt_text as social_share_alt
      FROM public.site_settings s
      LEFT JOIN public.media logo ON s.logo_media_id = logo.id
      LEFT JOIN public.media favicon ON s.favicon_media_id = favicon.id  
      LEFT JOIN public.media default_product ON s.default_product_image_id = default_product.id
      LEFT JOIN public.media default_avatar ON s.default_user_avatar_id = default_avatar.id
      LEFT JOIN public.media social_share ON s.social_share_image_id = social_share.id
      LIMIT 1
    `);

    // If no settings exist, return default values
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        settings: {
          site_name: "PlazaCMS",
          site_description: "",
          contact_email: "",
          contact_phone: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          currency_code: "USD",
          currency_symbol: "$",
          logo_media_id: null,
          favicon_media_id: null,
          default_product_image_id: null,
          default_user_avatar_id: null,
          social_share_image_id: null,
          other_settings: {},
        },
      });
    }

    return NextResponse.json({ success: true, settings: rows[0] });
  } catch (error: any) {
    console.error("Failed to get settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings/general
export async function PATCH(req: Request) {
  return NextResponse.json({
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev/api/admin/settings/general instead"
  }, { status: 410 }); // 410 Gone

  /*
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      site_name,
      site_description,
      contact_email,
      contact_phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      currency_code,
      currency_symbol,
      logo_media_id,
      favicon_media_id,
      default_product_image_id,
      default_user_avatar_id,
      social_share_image_id,
      other_settings,
    } = body;

    // Check if settings exist
    const { rows: existing } = await pool.query(
      "SELECT id FROM public.site_settings LIMIT 1"
    );

    if (existing.length === 0) {
      // Create new settings
      const { rows } = await pool.query(
        `
        INSERT INTO public.site_settings (
          site_name, site_description, contact_email, contact_phone,
          address_line1, address_line2, city, state, postal_code, country,
          currency_code, currency_symbol, logo_media_id, favicon_media_id,
          default_product_image_id, default_user_avatar_id, social_share_image_id,
          other_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `,
        [
          site_name,
          site_description,
          contact_email,
          contact_phone,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          currency_code,
          currency_symbol,
          logo_media_id,
          favicon_media_id,
          default_product_image_id,
          default_user_avatar_id,
          social_share_image_id,
          other_settings || {},
        ]
      );

      return NextResponse.json({ success: true, settings: rows[0] });
    } else {
      // Update existing settings
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      for (const [key, value] of Object.entries(body)) {
        if (key in body && value !== undefined) {
          fields.push(`${key} = $${i++}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 }
        );
      }

      values.push(existing[0].id);

      const { rows } = await pool.query(
        `
        UPDATE public.site_settings 
        SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${i}
        RETURNING *
      `,
        values
      );

      return NextResponse.json({ success: true, settings: rows[0] });
    }
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
  */
}

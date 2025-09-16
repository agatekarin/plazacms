import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const settingsGeneral = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/admin/settings/general
settingsGeneral.get("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);

    const rows = await sql`
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
    `;

    // If no settings exist, return default values
    if (rows.length === 0) {
      return c.json({
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

    return c.json({ success: true, settings: rows[0] });
  } catch (error: any) {
    console.error("Failed to get settings:", error);
    return c.json({ error: "Failed to load settings" }, 500);
  }
});

// PATCH /api/admin/settings/general
settingsGeneral.patch("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const body = await c.req.json().catch(() => ({}));

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
    const existing = await sql`SELECT id FROM public.site_settings LIMIT 1`;

    if (existing.length === 0) {
      // Create new settings
      const rows = await sql`
        INSERT INTO public.site_settings (
          site_name, site_description, contact_email, contact_phone,
          address_line1, address_line2, city, state, postal_code, country,
          currency_code, currency_symbol, logo_media_id, favicon_media_id,
          default_product_image_id, default_user_avatar_id, social_share_image_id,
          other_settings
        ) VALUES (
          ${site_name}, ${site_description}, ${contact_email}, ${contact_phone},
          ${address_line1}, ${address_line2}, ${city}, ${state}, ${postal_code}, ${country},
          ${currency_code}, ${currency_symbol}, ${logo_media_id}, ${favicon_media_id},
          ${default_product_image_id}, ${default_user_avatar_id}, ${social_share_image_id},
          ${other_settings || {}}
        )
        RETURNING *
      `;

      return c.json({ success: true, settings: rows[0] });
    } else {
      // Build update object with only defined fields
      const updates: Record<string, any> = {};

      // Map all possible fields that can be updated
      const allowedFields = [
        "site_name",
        "site_description",
        "contact_email",
        "contact_phone",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "country",
        "currency_code",
        "currency_symbol",
        "logo_media_id",
        "favicon_media_id",
        "default_product_image_id",
        "default_user_avatar_id",
        "social_share_image_id",
        "other_settings",
      ];

      for (const field of allowedFields) {
        if (field in body && body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return c.json({ error: "No fields to update" }, 400);
      }

      updates.updated_at = new Date();

      const rows = await sql`
        UPDATE public.site_settings 
        SET ${sql(updates)}
        WHERE id = ${existing[0].id}
        RETURNING *
      `;

      return c.json({ success: true, settings: rows[0] });
    }
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

export default settingsGeneral;

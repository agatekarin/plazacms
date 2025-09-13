import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

type ShippingSettings = {
  default_country?: string;
  default_currency?: string;
  weight_unit?: string;
  dimension_unit?: string;
  enable_free_shipping?: boolean;
  free_shipping_threshold?: number;
  max_weight_limit?: number;
  enable_shipping_zones?: boolean;
  enable_shipping_calculator?: boolean;
  shipping_tax_status?: string;
  shipping_tax_class?: string;
  hide_shipping_until_address?: boolean;
  enable_debug_mode?: boolean;
};

function mergeSettings(
  base: ShippingSettings,
  override: ShippingSettings
): ShippingSettings {
  return { ...base, ...override };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT id, country, currency_code, currency_symbol, other_settings
       FROM public.site_settings
       LIMIT 1`
    );

    // Defaults (US / USD)
    const defaultShipping: ShippingSettings = {
      default_country: "US",
      default_currency: "USD",
      weight_unit: "g",
      dimension_unit: "cm",
      enable_free_shipping: false,
      free_shipping_threshold: 0,
      max_weight_limit: 30000,
      enable_shipping_zones: true,
      enable_shipping_calculator: true,
      shipping_tax_status: "taxable",
      shipping_tax_class: "standard",
      hide_shipping_until_address: false,
      enable_debug_mode: false,
    };

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        settings: defaultShipping,
        meta: { country: "US", currency_code: "USD", currency_symbol: "$" },
      });
    }

    const row = result.rows[0];
    const otherSettings = (row.other_settings || {}) as {
      shipping?: ShippingSettings;
    };
    const storedShipping = otherSettings.shipping || {};
    const merged = mergeSettings(defaultShipping, storedShipping);

    // If country/currency are set at site level, reflect them as defaults
    if (row.country) merged.default_country = row.country;
    if (row.currency_code) merged.default_currency = row.currency_code;

    return NextResponse.json({
      success: true,
      settings: merged,
      meta: {
        country: row.country,
        currency_code: row.currency_code,
        currency_symbol: row.currency_symbol,
      },
    });
  } catch (error) {
    console.error("Failed to get shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to load shipping settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ShippingSettings & {
      default_country?: string;
      default_currency?: string;
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Ensure one site_settings row exists
      const existing = await client.query(
        `SELECT id, other_settings FROM public.site_settings LIMIT 1`
      );

      let siteId: string | null = null;
      let otherSettings: any = {};

      if (existing.rows.length === 0) {
        const inserted = await client.query(
          `INSERT INTO public.site_settings (site_name, country, currency_code, currency_symbol, other_settings)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, other_settings`,
          [
            "PlazaCMS",
            body.default_country || "US",
            body.default_currency || "USD",
            body.default_currency === "USD" ? "$" : "$",
            {},
          ]
        );
        siteId = inserted.rows[0].id;
        otherSettings = inserted.rows[0].other_settings || {};
      } else {
        siteId = existing.rows[0].id;
        otherSettings = existing.rows[0].other_settings || {};
      }

      const shippingSettings: ShippingSettings = {
        ...(otherSettings.shipping || {}),
        ...body,
      };

      // Update site-level country/currency if provided
      const updates: string[] = [];
      const values: any[] = [];
      let i = 1;
      if (body.default_country) {
        updates.push(`country = $${i++}`);
        values.push(body.default_country);
      }
      if (body.default_currency) {
        updates.push(`currency_code = $${i++}`);
        values.push(body.default_currency);
        // naive symbol mapping for USD; can extend later
        updates.push(`currency_symbol = $${i++}`);
        values.push(body.default_currency === "USD" ? "$" : "$");
      }

      // JSONB set for other_settings.shipping
      updates.push(
        `other_settings = jsonb_set(coalesce(other_settings, '{}'::jsonb), '{shipping}', $${i++}::jsonb, true)`
      );
      values.push(JSON.stringify(shippingSettings));

      values.push(siteId);
      const updateSql = `UPDATE public.site_settings SET ${updates.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING id`;
      await client.query(updateSql, values);

      await client.query("COMMIT");

      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to update shipping settings" },
      { status: 500 }
    );
  }
}

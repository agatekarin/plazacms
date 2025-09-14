// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev instead

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PUT() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PATCH() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

/*
ORIGINAL CODE COMMENTED OUT:
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: unknown }) {
  try {
    const params = (await context.params) as { id: string };
    const { id } = params;

    // Get zone details with relationships
    const zoneQuery = `
      SELECT 
        sz.*,
        COUNT(DISTINCT szc.country_code) as countries_count,
        COUNT(DISTINCT zg.gateway_id) as gateways_count,
        COUNT(DISTINCT sm.id) as methods_count
      FROM shipping_zones sz
      LEFT JOIN shipping_zone_countries szc ON sz.id = szc.zone_id
      LEFT JOIN zone_gateways zg ON sz.id = zg.zone_id AND zg.is_available = true
      LEFT JOIN shipping_methods sm ON sz.id = sm.zone_id AND sm.status = 'active'
      WHERE sz.id = $1
      GROUP BY sz.id
    `;

    const zoneResult = await pool.query(zoneQuery, [id]);

    if (zoneResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping zone not found" },
        { status: 404 }
      );
    }

    const zone = zoneResult.rows[0];

    // Get zone countries
    const countriesQuery = `
      SELECT country_code, country_name
      FROM shipping_zone_countries 
      WHERE zone_id = $1
      ORDER BY country_name
    `;
    const countriesResult = await pool.query(countriesQuery, [id]);

    // Get zone gateways with details
    const gatewaysQuery = `
      SELECT 
        zg.*,
        sg.name as gateway_name,
        sg.code as gateway_code,
        sg.type as gateway_type,
        sg.status as gateway_status
      FROM zone_gateways zg
      JOIN shipping_gateways sg ON zg.gateway_id = sg.id
      WHERE zg.zone_id = $1
      ORDER BY zg.priority ASC, sg.name ASC
    `;
    const gatewaysResult = await pool.query(gatewaysQuery, [id]);

    // Get zone methods with gateway info
    const methodsQuery = `
      SELECT 
        sm.*,
        sg.name as gateway_name,
        sg.code as gateway_code
      FROM shipping_methods sm
      JOIN shipping_gateways sg ON sm.gateway_id = sg.id
      WHERE sm.zone_id = $1
      ORDER BY sm.sort_order ASC, sm.name ASC
    `;
    const methodsResult = await pool.query(methodsQuery, [id]);

    return NextResponse.json({
      zone: {
        ...zone,
        countries_count: parseInt(zone.countries_count) || 0,
        gateways_count: parseInt(zone.gateways_count) || 0,
        methods_count: parseInt(zone.methods_count) || 0,
      },
      countries: countriesResult.rows,
      gateways: gatewaysResult.rows,
      methods: methodsResult.rows,
    });
  } catch (error) {
    console.error("Failed to fetch shipping zone:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping zone" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: unknown }) {
  try {
    const params = (await context.params) as { id: string };
    const { id } = params;
    const body = await request.json();

    const { code, name, description, priority, status, countries } = body;

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    // Check if zone exists
    const existingZone = await pool.query(
      "SELECT id FROM shipping_zones WHERE id = $1",
      [id]
    );

    if (existingZone.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping zone not found" },
        { status: 404 }
      );
    }

    // Check for duplicate code (excluding current zone)
    const duplicateZone = await pool.query(
      "SELECT id FROM shipping_zones WHERE code = $1 AND id != $2",
      [code, id]
    );

    if (duplicateZone.rows.length > 0) {
      return NextResponse.json(
        { error: "Zone code already exists" },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Update zone
      const zoneResult = await client.query(
        `UPDATE shipping_zones 
         SET code = $1, name = $2, description = $3, priority = $4, status = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [
          code.toUpperCase(),
          name,
          description || "",
          priority || 1,
          status || "active",
          id,
        ]
      );

      // Update country mappings
      // First remove existing countries
      await client.query(
        "DELETE FROM shipping_zone_countries WHERE zone_id = $1",
        [id]
      );

      // Then add new countries
      if (countries && countries.length > 0) {
        for (const country of countries) {
          await client.query(
            `INSERT INTO shipping_zone_countries (zone_id, country_code, country_name)
             VALUES ($1, $2, $3)`,
            [id, country.country_code, country.country_name]
          );
        }
      }

      await client.query("COMMIT");

      const zone = zoneResult.rows[0];

      return NextResponse.json({
        zone,
        message: "Shipping zone updated successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update shipping zone:", error);
    return NextResponse.json(
      { error: "Failed to update shipping zone" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: unknown }
) {
  try {
    const params = (await context.params) as { id: string };
    const { id } = params;

    // Check if zone exists
    const existingZone = await pool.query(
      "SELECT id, name FROM shipping_zones WHERE id = $1",
      [id]
    );

    if (existingZone.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping zone not found" },
        { status: 404 }
      );
    }

    // Check if zone is being used
    const usageCheck = await pool.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM shipping_methods WHERE zone_id = $1) as methods_count,
        (SELECT COUNT(*) FROM zone_gateways WHERE zone_id = $1) as gateways_count
    `,
      [id]
    );

    const usage = usageCheck.rows[0];
    const isUsed =
      parseInt(usage.methods_count) > 0 || parseInt(usage.gateways_count) > 0;

    if (isUsed) {
      return NextResponse.json(
        {
          error: "Cannot delete zone that has methods or gateways assigned",
          details: {
            methods_count: parseInt(usage.methods_count),
            gateways_count: parseInt(usage.gateways_count),
          },
        },
        { status: 400 }
      );
    }

    // Delete zone (cascade will handle countries)
    await pool.query("DELETE FROM shipping_zones WHERE id = $1", [id]);

    return NextResponse.json({
      message: "Shipping zone deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete shipping zone:", error);
    return NextResponse.json(
      { error: "Failed to delete shipping zone" },
      { status: 500 }
    );
  }
}

*/

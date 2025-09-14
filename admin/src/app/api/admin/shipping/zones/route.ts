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

// GET /api/admin/shipping/zones - List all shipping zones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add status filter
    if (status && status !== "all") {
      whereConditions.push(`sz.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      whereConditions.push(
        `(sz.name ILIKE $${paramIndex} OR sz.code ILIKE $${paramIndex} OR sz.description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM shipping_zones sz
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get zones with stats
    const offset = (page - 1) * limit;
    const zonesQuery = `
      SELECT 
        sz.*,
        COUNT(DISTINCT szc.country_code) as countries_count,
        COUNT(DISTINCT zg.gateway_id) as gateways_count,
        COUNT(DISTINCT sm.id) as methods_count,
        ARRAY_AGG(DISTINCT 
          CASE WHEN szc.country_code IS NOT NULL 
          THEN jsonb_build_object(
            'country_code', szc.country_code,
            'country_name', szc.country_name
          )
          ELSE NULL END
        ) FILTER (WHERE szc.country_code IS NOT NULL) as countries
      FROM shipping_zones sz
      LEFT JOIN shipping_zone_countries szc ON sz.id = szc.zone_id
      LEFT JOIN zone_gateways zg ON sz.id = zg.zone_id
      LEFT JOIN shipping_methods sm ON sz.id = sm.zone_id
      ${whereClause}
      GROUP BY sz.id
      ORDER BY sz.priority ASC, sz.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const zonesResult = await pool.query(zonesQuery, queryParams);

    const zones = zonesResult.rows.map((zone) => ({
      ...zone,
      countries: zone.countries || [],
      countries_count: parseInt(zone.countries_count) || 0,
      gateways_count: parseInt(zone.gateways_count) || 0,
      methods_count: parseInt(zone.methods_count) || 0,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      zones,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Failed to fetch shipping zones:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping zones" },
      { status: 500 }
    );
  }
}

// POST /api/admin/shipping/zones - Create new shipping zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description, priority, status, countries } = body;

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existingZone = await pool.query(
      "SELECT id FROM shipping_zones WHERE code = $1",
      [code]
    );

    if (existingZone.rows.length > 0) {
      return NextResponse.json(
        { error: "Zone code already exists" },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert zone
      const zoneResult = await client.query(
        `INSERT INTO shipping_zones 
         (code, name, description, priority, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          code.toUpperCase(),
          name,
          description || "",
          priority || 1,
          status || "active",
        ]
      );

      const zone = zoneResult.rows[0];

      // Insert country mappings if provided
      if (countries && countries.length > 0) {
        for (const country of countries) {
          await client.query(
            `INSERT INTO shipping_zone_countries (zone_id, country_code, country_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (zone_id, country_code) DO NOTHING`,
            [zone.id, country.country_code, country.country_name]
          );
        }
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          zone,
          message: "Shipping zone created successfully",
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to create shipping zone:", error);
    return NextResponse.json(
      { error: "Failed to create shipping zone" },
      { status: 500 }
    );
  }
}

*/

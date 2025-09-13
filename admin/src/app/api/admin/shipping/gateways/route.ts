import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/admin/shipping/gateways - List all shipping gateways
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";

    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add type filter
    if (type && type !== "all") {
      whereConditions.push(`sg.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    // Add status filter
    if (status && status !== "all") {
      whereConditions.push(`sg.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      whereConditions.push(
        `(sg.name ILIKE $${paramIndex} OR sg.code ILIKE $${paramIndex})`
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
      FROM shipping_gateways sg
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get gateways with stats
    const offset = (page - 1) * limit;
    const gatewaysQuery = `
      SELECT 
        sg.*,
        COUNT(DISTINCT zg.zone_id) as zones_count,
        COUNT(DISTINCT sm.id) as methods_count,
        ARRAY_AGG(DISTINCT 
          CASE WHEN sz.code IS NOT NULL 
          THEN jsonb_build_object(
            'zone_id', sz.id,
            'zone_code', sz.code,
            'zone_name', sz.name,
            'is_available', zg.is_available,
            'priority', zg.priority
          )
          ELSE NULL END
        ) FILTER (WHERE sz.code IS NOT NULL) as zones
      FROM shipping_gateways sg
      LEFT JOIN zone_gateways zg ON sg.id = zg.gateway_id
      LEFT JOIN shipping_zones sz ON zg.zone_id = sz.id
      LEFT JOIN shipping_methods sm ON sg.id = sm.gateway_id
      ${whereClause}
      GROUP BY sg.id
      ORDER BY sg.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const gatewaysResult = await pool.query(gatewaysQuery, queryParams);

    const gateways = gatewaysResult.rows.map((gateway) => ({
      ...gateway,
      zones: gateway.zones || [],
      zones_count: parseInt(gateway.zones_count) || 0,
      methods_count: parseInt(gateway.methods_count) || 0,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      gateways,
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
    console.error("Failed to fetch shipping gateways:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping gateways" },
      { status: 500 }
    );
  }
}

// POST /api/admin/shipping/gateways - Create new shipping gateway
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      type,
      logo_url,
      tracking_url_template,
      api_config,
      status,
      zones, // Array of {zone_id, is_available, priority}
    } = body;

    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["manual", "api", "hybrid"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be manual, api, or hybrid" },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existingGateway = await pool.query(
      "SELECT id FROM shipping_gateways WHERE code = $1",
      [code]
    );

    if (existingGateway.rows.length > 0) {
      return NextResponse.json(
        { error: "Gateway code already exists" },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert gateway
      const gatewayResult = await client.query(
        `INSERT INTO shipping_gateways 
         (code, name, type, logo_url, tracking_url_template, api_config, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          code.toUpperCase(),
          name,
          type,
          logo_url || "",
          tracking_url_template || "",
          api_config || {},
          status || "active",
        ]
      );

      const gateway = gatewayResult.rows[0];

      // Insert zone assignments if provided
      if (zones && zones.length > 0) {
        for (const zone of zones) {
          await client.query(
            `INSERT INTO zone_gateways (zone_id, gateway_id, is_available, priority)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (zone_id, gateway_id) 
             DO UPDATE SET is_available = $3, priority = $4`,
            [
              zone.zone_id,
              gateway.id,
              zone.is_available !== false,
              zone.priority || 1,
            ]
          );
        }
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          gateway,
          message: "Shipping gateway created successfully",
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
    console.error("Failed to create shipping gateway:", error);
    return NextResponse.json(
      { error: "Failed to create shipping gateway" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/admin/shipping/methods - List all shipping methods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const zone_id = searchParams.get("zone_id") || "";
    const gateway_id = searchParams.get("gateway_id") || "";
    const method_type = searchParams.get("method_type") || "";
    const status = searchParams.get("status") || "";
    const currency = searchParams.get("currency") || "";
    const search = searchParams.get("search") || "";

    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add zone filter
    if (zone_id && zone_id !== "all") {
      whereConditions.push(`sm.zone_id = $${paramIndex}`);
      queryParams.push(zone_id);
      paramIndex++;
    }

    // Add gateway filter
    if (gateway_id && gateway_id !== "all") {
      whereConditions.push(`sm.gateway_id = $${paramIndex}`);
      queryParams.push(gateway_id);
      paramIndex++;
    }

    // Add method type filter
    if (method_type && method_type !== "all") {
      whereConditions.push(`sm.method_type = $${paramIndex}`);
      queryParams.push(method_type);
      paramIndex++;
    }

    // Add status filter
    if (status && status !== "all") {
      whereConditions.push(`sm.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Add currency filter
    if (currency && currency !== "all") {
      whereConditions.push(`sm.currency = $${paramIndex}`);
      queryParams.push(currency);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      whereConditions.push(
        `(sm.name ILIKE $${paramIndex} OR sm.description ILIKE $${paramIndex} OR sz.name ILIKE $${paramIndex} OR sg.name ILIKE $${paramIndex})`
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
      FROM shipping_methods sm
      JOIN shipping_zones sz ON sm.zone_id = sz.id
      JOIN shipping_gateways sg ON sm.gateway_id = sg.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get methods with zone and gateway details
    const offset = (page - 1) * limit;
    const methodsQuery = `
      SELECT 
        sm.id,
        sm.zone_id,
        sm.gateway_id,
        sm.name,
        sm.method_type,
        CAST(sm.base_cost AS FLOAT) as base_cost,
        sm.currency,
        sm.weight_unit,
        sm.weight_threshold,
        CAST(sm.cost_per_kg AS FLOAT) as cost_per_kg,
        CAST(sm.min_free_threshold AS FLOAT) as min_free_threshold,
        sm.max_free_weight,
        sm.max_weight_limit,
        sm.max_dimensions,
        sm.restricted_items,
        sm.restricted_products,
        sm.description,
        sm.estimated_days_min,
        sm.estimated_days_max,
        sm.sort_order,
        sm.status,
        sm.created_at,
        sm.updated_at,
        sz.name as zone_name,
        sz.code as zone_code,
        sz.priority as zone_priority,
        sg.name as gateway_name,
        sg.code as gateway_code,
        sg.type as gateway_type
      FROM shipping_methods sm
      JOIN shipping_zones sz ON sm.zone_id = sz.id
      JOIN shipping_gateways sg ON sm.gateway_id = sg.id
      ${whereClause}
      ORDER BY sz.priority ASC, sm.sort_order ASC, sm.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const methodsResult = await pool.query(methodsQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      methods: methodsResult.rows,
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
    console.error("Failed to fetch shipping methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping methods" },
      { status: 500 }
    );
  }
}

// POST /api/admin/shipping/methods - Create new shipping method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      zone_id,
      gateway_id,
      name,
      method_type,
      base_cost,
      currency,
      weight_unit,
      weight_threshold,
      cost_per_kg,
      min_free_threshold,
      max_free_weight,
      max_weight_limit,
      max_dimensions,
      restricted_items,
      restricted_products,
      description,
      estimated_days_min,
      estimated_days_max,
      status,
      sort_order,
    } = body;

    // Validate required fields
    if (!zone_id || !gateway_id || !name || !method_type) {
      return NextResponse.json(
        { error: "Zone, gateway, name, and method type are required" },
        { status: 400 }
      );
    }

    // Validate method type
    if (
      !["flat", "weight_based", "free_shipping", "percentage"].includes(
        method_type
      )
    ) {
      return NextResponse.json(
        { error: "Invalid method type" },
        { status: 400 }
      );
    }

    // Check if zone and gateway exist and are compatible
    const compatibilityCheck = await pool.query(
      `SELECT zg.is_available
       FROM zone_gateways zg
       WHERE zg.zone_id = $1 AND zg.gateway_id = $2`,
      [zone_id, gateway_id]
    );

    if (compatibilityCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Gateway is not available for this zone" },
        { status: 400 }
      );
    }

    if (!compatibilityCheck.rows[0].is_available) {
      return NextResponse.json(
        { error: "Gateway is disabled for this zone" },
        { status: 400 }
      );
    }

    // Check for duplicate method name within zone-gateway combination
    const duplicateMethod = await pool.query(
      "SELECT id FROM shipping_methods WHERE zone_id = $1 AND gateway_id = $2 AND name = $3",
      [zone_id, gateway_id, name]
    );

    if (duplicateMethod.rows.length > 0) {
      return NextResponse.json(
        {
          error: "Method name already exists for this zone-gateway combination",
        },
        { status: 400 }
      );
    }

    // Insert shipping method
    const methodQuery = `
      INSERT INTO shipping_methods (
        zone_id, gateway_id, name, method_type, base_cost, currency,
        weight_unit, weight_threshold, cost_per_kg, min_free_threshold, max_free_weight,
        max_weight_limit, max_dimensions, restricted_items, restricted_products, description,
        estimated_days_min, estimated_days_max, status, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const methodResult = await pool.query(methodQuery, [
      zone_id,
      gateway_id,
      name,
      method_type,
      base_cost || 0,
      currency || "USD",
      weight_unit || "g",
      weight_threshold || 1000,
      cost_per_kg || 0,
      min_free_threshold || 0,
      max_free_weight || 0,
      max_weight_limit || 30000,
      JSON.stringify(max_dimensions || {}),
      JSON.stringify(restricted_items || []),
      JSON.stringify(restricted_products || []),
      description || "",
      estimated_days_min || 1,
      estimated_days_max || 7,
      status || "active",
      sort_order || 0,
    ]);

    const newMethod = methodResult.rows[0];

    return NextResponse.json(
      {
        method: newMethod,
        message: "Shipping method created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create shipping method:", error);
    return NextResponse.json(
      { error: "Failed to create shipping method" },
      { status: 500 }
    );
  }
}

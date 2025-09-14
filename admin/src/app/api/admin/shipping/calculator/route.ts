import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// POST /api/admin/shipping/calculator - Calculate shipping costs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      country_code,
      cart_total,
      total_weight_g,
      zone_id, // Optional: filter by specific zone
      gateway_id, // Optional: filter by specific gateway
      method_type, // Optional: filter by method type
    } = body;

    // Validate required fields
    if (
      !country_code ||
      cart_total === undefined ||
      total_weight_g === undefined
    ) {
      return NextResponse.json(
        { error: "Country code, cart total, and total weight are required" },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (cart_total < 0 || total_weight_g < 0) {
      return NextResponse.json(
        { error: "Cart total and weight must be positive numbers" },
        { status: 400 }
      );
    }

    const whereConditions = [
      "sz.status = 'active'",
      "sg.status = 'active'",
      "sm.status = 'active'",
    ];
    const queryParams: any[] = [
      country_code.toUpperCase(),
      cart_total,
      total_weight_g,
    ];
    let paramIndex = 4;

    // Add optional filters
    if (zone_id) {
      whereConditions.push(`sz.id = $${paramIndex}`);
      queryParams.push(zone_id);
      paramIndex++;
    }

    if (gateway_id) {
      whereConditions.push(`sg.id = $${paramIndex}`);
      queryParams.push(gateway_id);
      paramIndex++;
    }

    if (method_type && method_type !== "all") {
      whereConditions.push(`sm.method_type = $${paramIndex}`);
      queryParams.push(method_type);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get available shipping methods for the country with calculated costs
    const methodsQuery = `
      SELECT 
        sm.*,
        sz.name as zone_name,
        sz.code as zone_code,
        sz.priority as zone_priority,
        sg.name as gateway_name,
        sg.code as gateway_code,
        sg.type as gateway_type,
        calc_shipping_cost(sm.id, $2, $3) as calculated_cost
      FROM shipping_methods sm
      JOIN shipping_zones sz ON sm.zone_id = sz.id
      JOIN shipping_gateways sg ON sm.gateway_id = sg.id
      JOIN shipping_zone_countries szc ON sz.id = szc.zone_id
      JOIN zone_gateways zg ON sz.id = zg.zone_id AND sg.id = zg.gateway_id
      WHERE szc.country_code = $1 
        AND zg.is_available = true
        AND ${whereClause}
        AND calc_shipping_cost(sm.id, $2, $3) IS NOT NULL
      ORDER BY sz.priority ASC, calculated_cost ASC, sm.sort_order ASC
    `;

    const methodsResult = await pool.query(methodsQuery, queryParams);

    const methods = methodsResult.rows.map((method) => ({
      id: method.id,
      name: method.name,
      method_type: method.method_type,
      currency: method.currency,
      calculated_cost: parseFloat(method.calculated_cost),
      estimated_days_min: method.estimated_days_min,
      estimated_days_max: method.estimated_days_max,
      zone: {
        id: method.zone_id,
        name: method.zone_name,
        code: method.zone_code,
        priority: method.zone_priority,
      },
      gateway: {
        id: method.gateway_id,
        name: method.gateway_name,
        code: method.gateway_code,
        type: method.gateway_type,
      },
    }));

    // Find the cheapest option
    let cheapest_method = null;
    if (methods.length > 0) {
      cheapest_method = methods.reduce((prev, current) =>
        prev.calculated_cost < current.calculated_cost ? prev : current
      );
    }

    // Group methods by currency for summary
    const currency_summary = methods.reduce((acc: any, method) => {
      const currency = method.currency;
      if (!acc[currency]) {
        acc[currency] = {
          currency,
          methods_count: 0,
          cheapest_cost: Infinity,
          most_expensive_cost: 0,
          free_shipping_available: false,
        };
      }

      acc[currency].methods_count++;
      acc[currency].cheapest_cost = Math.min(
        acc[currency].cheapest_cost,
        method.calculated_cost
      );
      acc[currency].most_expensive_cost = Math.max(
        acc[currency].most_expensive_cost,
        method.calculated_cost
      );

      if (method.calculated_cost === 0) {
        acc[currency].free_shipping_available = true;
      }

      return acc;
    }, {});

    // Convert summary to array
    const summary = Object.values(currency_summary).map((summary: any) => ({
      ...summary,
      cheapest_cost:
        summary.cheapest_cost === Infinity ? 0 : summary.cheapest_cost,
    }));

    return NextResponse.json({
      country_code,
      cart_total,
      total_weight_g,
      methods,
      cheapest_method,
      summary,
      total_methods_found: methods.length,
    });
  } catch (error) {
    console.error("Failed to calculate shipping costs:", error);
    return NextResponse.json(
      { error: "Failed to calculate shipping costs" },
      { status: 500 }
    );
  }
}

// GET /api/admin/shipping/calculator/countries - Get available countries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const whereConditions = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        `(szc.country_name ILIKE $${paramIndex} OR szc.country_code ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get countries that have shipping zones
    const countriesQuery = `
      SELECT DISTINCT
        szc.country_code,
        szc.country_name,
        sz.name as zone_name,
        sz.code as zone_code,
        COUNT(DISTINCT sm.id) as methods_count
      FROM shipping_zone_countries szc
      JOIN shipping_zones sz ON szc.zone_id = sz.id
      LEFT JOIN shipping_methods sm ON sz.id = sm.zone_id AND sm.status = 'active'
      ${whereClause}
      GROUP BY szc.country_code, szc.country_name, sz.name, sz.code
      HAVING COUNT(DISTINCT sm.id) > 0
      ORDER BY szc.country_name ASC
    `;

    const countriesResult = await pool.query(countriesQuery, queryParams);

    return NextResponse.json({
      countries: countriesResult.rows,
    });
  } catch (error) {
    console.error("Failed to fetch available countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch available countries" },
      { status: 500 }
    );
  }
}

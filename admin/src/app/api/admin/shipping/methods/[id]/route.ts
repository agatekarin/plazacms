import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: unknown }) {
  try {
    const params = (await context.params) as { id: string };
    const { id } = params;

    // Get method details with zone and gateway info
    const methodQuery = `
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
        sm.description,
        sm.estimated_days_min,
        sm.estimated_days_max,
        sm.sort_order,
        sm.status,
        sm.created_at,
        sm.updated_at,
        sz.name as zone_name,
        sz.code as zone_code,
        sz.status as zone_status,
        sg.name as gateway_name,
        sg.code as gateway_code,
        sg.type as gateway_type,
        sg.status as gateway_status
      FROM shipping_methods sm
      JOIN shipping_zones sz ON sm.zone_id = sz.id
      JOIN shipping_gateways sg ON sm.gateway_id = sg.id
      WHERE sm.id = $1
    `;

    const methodResult = await pool.query(methodQuery, [id]);

    if (methodResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping method not found" },
        { status: 404 }
      );
    }

    const method = methodResult.rows[0];

    return NextResponse.json({
      method: {
        ...method,
        max_dimensions:
          typeof method.max_dimensions === "string"
            ? JSON.parse(method.max_dimensions)
            : method.max_dimensions,
        restricted_items:
          typeof method.restricted_items === "string"
            ? JSON.parse(method.restricted_items)
            : method.restricted_items,
      },
    });
  } catch (error) {
    console.error("Failed to fetch shipping method:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping method" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: unknown }) {
  try {
    const params = (await context.params) as { id: string };
    const { id } = params;
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

    // Check if method exists
    const existingMethod = await pool.query(
      "SELECT id FROM shipping_methods WHERE id = $1",
      [id]
    );

    if (existingMethod.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping method not found" },
        { status: 404 }
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

    // Check for duplicate method name within zone-gateway combination (excluding current)
    const duplicateMethod = await pool.query(
      "SELECT id FROM shipping_methods WHERE zone_id = $1 AND gateway_id = $2 AND name = $3 AND id != $4",
      [zone_id, gateway_id, name, id]
    );

    if (duplicateMethod.rows.length > 0) {
      return NextResponse.json(
        {
          error: "Method name already exists for this zone-gateway combination",
        },
        { status: 400 }
      );
    }

    // Update shipping method
    const methodResult = await pool.query(
      `UPDATE shipping_methods 
       SET zone_id = $1, gateway_id = $2, name = $3, method_type = $4, base_cost = $5,
           currency = $6, weight_unit = $7, weight_threshold = $8, cost_per_kg = $9,
           min_free_threshold = $10, max_free_weight = $11, max_weight_limit = $12,
           max_dimensions = $13, restricted_items = $14, description = $15,
           estimated_days_min = $16, estimated_days_max = $17, status = $18, sort_order = $19,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $20
       RETURNING *`,
      [
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
        description || "",
        estimated_days_min || 1,
        estimated_days_max || 7,
        status || "active",
        sort_order || 0,
        id,
      ]
    );

    const method = methodResult.rows[0];

    return NextResponse.json({
      method,
      message: "Shipping method updated successfully",
    });
  } catch (error) {
    console.error("Failed to update shipping method:", error);
    return NextResponse.json(
      { error: "Failed to update shipping method" },
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

    // Check if method exists
    const existingMethod = await pool.query(
      "SELECT id, name FROM shipping_methods WHERE id = $1",
      [id]
    );

    if (existingMethod.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping method not found" },
        { status: 404 }
      );
    }

    // Check if method is being used in orders
    const usageCheck = await pool.query(
      "SELECT COUNT(*) as orders_count FROM orders WHERE shipping_method_id = $1",
      [id]
    );

    const ordersCount = parseInt(usageCheck.rows[0].orders_count);

    if (ordersCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete shipping method that has been used in orders",
          details: { orders_count: ordersCount },
        },
        { status: 400 }
      );
    }

    // Delete method
    await pool.query("DELETE FROM shipping_methods WHERE id = $1", [id]);

    return NextResponse.json({
      message: "Shipping method deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete shipping method:", error);
    return NextResponse.json(
      { error: "Failed to delete shipping method" },
      { status: 500 }
    );
  }
}

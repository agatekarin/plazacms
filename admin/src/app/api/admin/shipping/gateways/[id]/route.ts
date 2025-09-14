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

    // Get gateway details with relationships
    const gatewayQuery = `
      SELECT 
        sg.*,
        COUNT(DISTINCT zg.zone_id) as zones_count,
        COUNT(DISTINCT sm.id) as methods_count
      FROM shipping_gateways sg
      LEFT JOIN zone_gateways zg ON sg.id = zg.gateway_id
      LEFT JOIN shipping_methods sm ON sg.id = sm.gateway_id AND sm.status = 'active'
      WHERE sg.id = $1
      GROUP BY sg.id
    `;

    const gatewayResult = await pool.query(gatewayQuery, [id]);

    if (gatewayResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping gateway not found" },
        { status: 404 }
      );
    }

    const gateway = gatewayResult.rows[0];

    // Get zone assignments
    const zonesQuery = `
      SELECT 
        zg.*,
        sz.code as zone_code,
        sz.name as zone_name,
        sz.status as zone_status
      FROM zone_gateways zg
      JOIN shipping_zones sz ON zg.zone_id = sz.id
      WHERE zg.gateway_id = $1
      ORDER BY zg.priority ASC, sz.name ASC
    `;
    const zonesResult = await pool.query(zonesQuery, [id]);

    // Get methods for this gateway
    const methodsQuery = `
      SELECT 
        sm.*,
        sz.code as zone_code,
        sz.name as zone_name
      FROM shipping_methods sm
      JOIN shipping_zones sz ON sm.zone_id = sz.id
      WHERE sm.gateway_id = $1
      ORDER BY sz.name ASC, sm.sort_order ASC, sm.name ASC
    `;
    const methodsResult = await pool.query(methodsQuery, [id]);

    return NextResponse.json({
      gateway: {
        ...gateway,
        zones_count: parseInt(gateway.zones_count) || 0,
        methods_count: parseInt(gateway.methods_count) || 0,
      },
      zones: zonesResult.rows,
      methods: methodsResult.rows,
    });
  } catch (error) {
    console.error("Failed to fetch shipping gateway:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping gateway" },
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
      code,
      name,
      type,
      logo_url,
      tracking_url_template,
      api_config,
      status,
      zones,
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

    // Check if gateway exists
    const existingGateway = await pool.query(
      "SELECT id FROM shipping_gateways WHERE id = $1",
      [id]
    );

    if (existingGateway.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping gateway not found" },
        { status: 404 }
      );
    }

    // Check for duplicate code (excluding current gateway)
    const duplicateGateway = await pool.query(
      "SELECT id FROM shipping_gateways WHERE code = $1 AND id != $2",
      [code, id]
    );

    if (duplicateGateway.rows.length > 0) {
      return NextResponse.json(
        { error: "Gateway code already exists" },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Update gateway
      const gatewayResult = await client.query(
        `UPDATE shipping_gateways 
         SET code = $1, name = $2, type = $3, logo_url = $4, 
             tracking_url_template = $5, api_config = $6, status = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          code.toUpperCase(),
          name,
          type,
          logo_url || "",
          tracking_url_template || "",
          api_config || {},
          status || "active",
          id,
        ]
      );

      // Update zone assignments
      if (zones !== undefined) {
        // First remove existing zone assignments
        await client.query("DELETE FROM zone_gateways WHERE gateway_id = $1", [
          id,
        ]);

        // Then add new assignments
        if (zones && zones.length > 0) {
          for (const zone of zones) {
            await client.query(
              `INSERT INTO zone_gateways (zone_id, gateway_id, is_available, priority)
               VALUES ($1, $2, $3, $4)`,
              [
                zone.zone_id,
                id,
                zone.is_available !== false,
                zone.priority || 1,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");

      const gateway = gatewayResult.rows[0];

      return NextResponse.json({
        gateway,
        message: "Shipping gateway updated successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update shipping gateway:", error);
    return NextResponse.json(
      { error: "Failed to update shipping gateway" },
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

    // Check if gateway exists
    const existingGateway = await pool.query(
      "SELECT id, name FROM shipping_gateways WHERE id = $1",
      [id]
    );

    if (existingGateway.rows.length === 0) {
      return NextResponse.json(
        { error: "Shipping gateway not found" },
        { status: 404 }
      );
    }

    // Check if gateway is being used
    const usageCheck = await pool.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM shipping_methods WHERE gateway_id = $1) as methods_count,
        (SELECT COUNT(*) FROM zone_gateways WHERE gateway_id = $1) as zones_count
    `,
      [id]
    );

    const usage = usageCheck.rows[0];
    const isUsed = parseInt(usage.methods_count) > 0;

    if (isUsed) {
      return NextResponse.json(
        {
          error: "Cannot delete gateway that has shipping methods",
          details: {
            methods_count: parseInt(usage.methods_count),
            zones_count: parseInt(usage.zones_count),
          },
        },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Delete zone assignments first
      await client.query("DELETE FROM zone_gateways WHERE gateway_id = $1", [
        id,
      ]);

      // Delete gateway
      await client.query("DELETE FROM shipping_gateways WHERE id = $1", [id]);

      await client.query("COMMIT");

      return NextResponse.json({
        message: "Shipping gateway deleted successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to delete shipping gateway:", error);
    return NextResponse.json(
      { error: "Failed to delete shipping gateway" },
      { status: 500 }
    );
  }
}

*/

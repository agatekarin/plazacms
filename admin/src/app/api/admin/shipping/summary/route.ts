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

// GET /api/admin/shipping/summary - Get shipping system summary
export async function GET(request: NextRequest) {
  try {
    // Get counts and stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM shipping_zones WHERE status = 'active') as active_zones,
        (SELECT COUNT(*) FROM shipping_zones WHERE status = 'inactive') as inactive_zones,
        (SELECT COUNT(*) FROM shipping_gateways WHERE status = 'active') as active_gateways,
        (SELECT COUNT(*) FROM shipping_gateways WHERE status = 'inactive') as inactive_gateways,
        (SELECT COUNT(*) FROM shipping_methods WHERE status = 'active') as active_methods,
        (SELECT COUNT(*) FROM shipping_methods WHERE status = 'inactive') as inactive_methods,
        (SELECT COUNT(DISTINCT country_code) FROM shipping_zone_countries) as countries_covered,
        (SELECT COUNT(*) FROM zone_gateways WHERE is_available = true) as active_zone_gateways
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get zone breakdown with methods count
    const zonesQuery = `
      SELECT 
        sz.id,
        sz.code,
        sz.name,
        sz.status,
        sz.priority,
        COUNT(DISTINCT szc.country_code) as countries_count,
        COUNT(DISTINCT sm.id) FILTER (WHERE sm.status = 'active') as active_methods_count,
        COUNT(DISTINCT zg.gateway_id) FILTER (WHERE zg.is_available = true) as available_gateways_count
      FROM shipping_zones sz
      LEFT JOIN shipping_zone_countries szc ON sz.id = szc.zone_id
      LEFT JOIN shipping_methods sm ON sz.id = sm.zone_id
      LEFT JOIN zone_gateways zg ON sz.id = zg.zone_id
      GROUP BY sz.id, sz.code, sz.name, sz.status, sz.priority
      ORDER BY sz.priority ASC, sz.name ASC
    `;

    const zonesResult = await pool.query(zonesQuery);

    // Get gateway breakdown
    const gatewaysQuery = `
      SELECT 
        sg.id,
        sg.code,
        sg.name,
        sg.type,
        sg.status,
        COUNT(DISTINCT zg.zone_id) FILTER (WHERE zg.is_available = true) as available_zones_count,
        COUNT(DISTINCT sm.id) FILTER (WHERE sm.status = 'active') as active_methods_count
      FROM shipping_gateways sg
      LEFT JOIN zone_gateways zg ON sg.id = zg.gateway_id
      LEFT JOIN shipping_methods sm ON sg.id = sm.gateway_id
      GROUP BY sg.id, sg.code, sg.name, sg.type, sg.status
      ORDER BY sg.name ASC
    `;

    const gatewaysResult = await pool.query(gatewaysQuery);

    // Get method types breakdown
    const methodTypesQuery = `
      SELECT 
        sm.method_type,
        sm.currency,
        COUNT(*) as count,
        AVG(sm.base_cost) as avg_base_cost,
        MIN(sm.base_cost) as min_base_cost,
        MAX(sm.base_cost) as max_base_cost
      FROM shipping_methods sm
      WHERE sm.status = 'active'
      GROUP BY sm.method_type, sm.currency
      ORDER BY sm.method_type, sm.currency
    `;

    const methodTypesResult = await pool.query(methodTypesQuery);

    // Get top countries by methods available
    const topCountriesQuery = `
      SELECT 
        szc.country_code,
        szc.country_name,
        sz.code as zone_code,
        sz.name as zone_name,
        COUNT(DISTINCT sm.id) FILTER (WHERE sm.status = 'active') as methods_count
      FROM shipping_zone_countries szc
      JOIN shipping_zones sz ON szc.zone_id = sz.id
      LEFT JOIN shipping_methods sm ON sz.id = sm.zone_id
      GROUP BY szc.country_code, szc.country_name, sz.code, sz.name
      HAVING COUNT(DISTINCT sm.id) FILTER (WHERE sm.status = 'active') > 0
      ORDER BY methods_count DESC, szc.country_name ASC
      LIMIT 20
    `;

    const topCountriesResult = await pool.query(topCountriesQuery);

    return NextResponse.json({
      stats: {
        zones: {
          active: parseInt(stats.active_zones),
          inactive: parseInt(stats.inactive_zones),
          total: parseInt(stats.active_zones) + parseInt(stats.inactive_zones),
        },
        gateways: {
          active: parseInt(stats.active_gateways),
          inactive: parseInt(stats.inactive_gateways),
          total:
            parseInt(stats.active_gateways) + parseInt(stats.inactive_gateways),
        },
        methods: {
          active: parseInt(stats.active_methods),
          inactive: parseInt(stats.inactive_methods),
          total:
            parseInt(stats.active_methods) + parseInt(stats.inactive_methods),
        },
        countries_covered: parseInt(stats.countries_covered),
        active_zone_gateways: parseInt(stats.active_zone_gateways),
      },
      zones: zonesResult.rows.map((zone) => ({
        ...zone,
        countries_count: parseInt(zone.countries_count),
        active_methods_count: parseInt(zone.active_methods_count),
        available_gateways_count: parseInt(zone.available_gateways_count),
      })),
      gateways: gatewaysResult.rows.map((gateway) => ({
        ...gateway,
        available_zones_count: parseInt(gateway.available_zones_count),
        active_methods_count: parseInt(gateway.active_methods_count),
      })),
      method_types: methodTypesResult.rows.map((type) => ({
        ...type,
        count: parseInt(type.count),
        avg_base_cost: parseFloat(type.avg_base_cost) || 0,
        min_base_cost: parseFloat(type.min_base_cost) || 0,
        max_base_cost: parseFloat(type.max_base_cost) || 0,
      })),
      top_countries: topCountriesResult.rows.map((country) => ({
        ...country,
        methods_count: parseInt(country.methods_count),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch shipping summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping summary" },
      { status: 500 }
    );
  }
}

*/

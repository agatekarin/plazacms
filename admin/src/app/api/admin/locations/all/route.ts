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
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/locations/all - Get all location data for form dropdowns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '500'); // Higher limit for all data

    // Get all countries
    const countriesQuery = `
      SELECT id, name, iso2, iso3
      FROM countries 
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT 250
    `;
    const countriesResult = await db.query(countriesQuery, [`%${search}%`]);

    // Get all states with country info
    const statesQuery = `
      SELECT s.id, s.name, s.country_id, c.name as country_name
      FROM states s
      JOIN countries c ON s.country_id = c.id
      WHERE s.name ILIKE $1 OR c.name ILIKE $1
      ORDER BY c.name, s.name ASC
      LIMIT $2
    `;
    const statesResult = await db.query(statesQuery, [`%${search}%`, limit]);

    // Get cities with state and country info (limited for performance)
    const citiesQuery = `
      SELECT ci.id, ci.name, ci.state_id, s.name as state_name, 
             c.name as country_name, c.id as country_id
      FROM cities ci
      JOIN states s ON ci.state_id = s.id
      JOIN countries c ON s.country_id = c.id
      WHERE ci.name ILIKE $1 OR s.name ILIKE $1 OR c.name ILIKE $1
      ORDER BY c.name, s.name, ci.name ASC
      LIMIT $2
    `;
    const citiesResult = await db.query(citiesQuery, [`%${search}%`, Math.min(limit, 1000)]);

    // Group states by country for easier frontend usage
    const statesByCountry: { [countryId: string]: any[] } = {};
    statesResult.rows.forEach(state => {
      if (!statesByCountry[state.country_id]) {
        statesByCountry[state.country_id] = [];
      }
      statesByCountry[state.country_id].push(state);
    });

    // Group cities by state for easier frontend usage
    const citiesByState: { [stateId: string]: any[] } = {};
    citiesResult.rows.forEach(city => {
      if (!citiesByState[city.state_id]) {
        citiesByState[city.state_id] = [];
      }
      citiesByState[city.state_id].push(city);
    });

    return NextResponse.json({
      countries: countriesResult.rows,
      states: statesResult.rows,
      cities: citiesResult.rows,
      statesByCountry,
      citiesByState,
      totals: {
        countries: countriesResult.rows.length,
        states: statesResult.rows.length,
        cities: citiesResult.rows.length
      }
    });

  } catch (error) {
    console.error('Failed to fetch all locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
*/

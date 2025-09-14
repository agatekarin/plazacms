import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/locations/countries - Get all countries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    let whereClause = '';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = `WHERE name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT id, name, iso2, iso3, phone_code, currency, region
      FROM countries 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex}
    `;

    queryParams.push(limit);
    const result = await db.query(query, queryParams);

    return NextResponse.json({
      countries: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Failed to fetch countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
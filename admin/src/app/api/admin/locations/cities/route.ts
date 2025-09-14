import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/locations/cities - Get cities by state
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stateId = searchParams.get('state_id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!stateId) {
      return NextResponse.json(
        { error: 'state_id parameter is required' },
        { status: 400 }
      );
    }

    let whereClause = 'WHERE state_id = $1';
    const queryParams: any[] = [stateId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT id, name, state_id, latitude, longitude
      FROM cities 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex}
    `;

    queryParams.push(limit);
    const result = await db.query(query, queryParams);

    return NextResponse.json({
      cities: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Failed to fetch cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}
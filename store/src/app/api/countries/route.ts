import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    let rows;
    if (q) {
      rows = (
        await db.query(
          `SELECT iso2, name FROM countries WHERE name ILIKE $1 OR iso2 ILIKE $1 ORDER BY name ASC LIMIT 50`,
          ["%" + q + "%"]
        )
      ).rows;
    } else {
      rows = (
        await db.query(
          `SELECT iso2, name FROM countries ORDER BY name ASC LIMIT 50`
        )
      ).rows;
    }
    return NextResponse.json({ items: rows });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load countries" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type DbCategory = {
  id: string;
  name: string;
  slug: string;
};

export async function GET() {
  try {
    const { rows } = await db.query<DbCategory>(
      `SELECT id, name, slug FROM categories ORDER BY name ASC`
    );
    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

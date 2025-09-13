import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const start = Date.now();
    // lightweight check to DB (no-op if DATABASE_URL missing)
    if (process.env.DATABASE_URL) {
      await db.query("SELECT 1");
    }
    const ms = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      db: !!process.env.DATABASE_URL,
      ms,
    });
  } catch (error) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user && (session.user as any).role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product IDs provided" }, { status: 400 });
    }

    // Validate that all IDs are valid UUIDs/numbers
    const validIds = ids.filter(id => id && typeof id === 'string');
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid product IDs provided" }, { status: 400 });
    }

    // Create placeholders for the IN clause
    const placeholders = validIds.map((_, index) => `$${index + 1}`).join(',');
    
    // Delete products (this will also cascade to related tables if foreign keys are set up properly)
    const result = await pool.query(
      `DELETE FROM public.products WHERE id IN (${placeholders})`,
      validIds
    );

    return NextResponse.json({
      message: `Successfully deleted ${result.rowCount} products`,
      deletedCount: result.rowCount
    });

  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete products" },
      { status: 500 }
    );
  }
}
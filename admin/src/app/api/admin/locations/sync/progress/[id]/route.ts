import { NextRequest, NextResponse } from "next/server";
import { locationImporter } from "@/lib/location-importer";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const progress = locationImporter.getProgress(id);

    if (!progress) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Failed to get progress:", error);
    return NextResponse.json(
      { error: "Failed to get progress" },
      { status: 500 }
    );
  }
}

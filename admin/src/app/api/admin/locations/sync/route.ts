import { NextRequest, NextResponse } from "next/server";
import { locationImporter } from "@/lib/location-importer";

export async function GET() {
  try {
    // Check GitHub releases for latest version
    const response = await fetch(
      "https://api.github.com/repos/dr5hn/countries-states-cities-database/releases/latest"
    );
    const release = await response.json();

    // Get current version from database
    const currentVersion = await locationImporter.getCurrentVersion();

    return NextResponse.json({
      latest_version: release.tag_name,
      current_version: currentVersion || "none",
      update_available: release.tag_name !== currentVersion,
      last_sync: await locationImporter.getLastSyncDate(),
      release_date: release.published_at,
      total_countries: 250,
      total_states: 5038,
      total_cities: 151024,
    });
  } catch (error) {
    console.error("Failed to check sync status:", error);
    return NextResponse.json(
      { error: "Failed to check updates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { format = "csv", tables = ["countries", "states", "cities"] } =
      await request.json();

    // Validate format
    if (!["csv", "json"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use csv or json" },
        { status: 400 }
      );
    }

    // Validate tables
    const validTables = ["countries", "states", "cities"];
    const invalidTables = tables.filter(
      (t: string) => !validTables.includes(t)
    );
    if (invalidTables.length > 0) {
      return NextResponse.json(
        { error: `Invalid tables: ${invalidTables.join(", ")}` },
        { status: 400 }
      );
    }

    // Start import process
    const importId = await locationImporter.startImport(format, tables);

    return NextResponse.json({
      import_id: importId,
      status: "started",
      message: "Location data import started in background",
      format,
      tables,
    });
  } catch (error) {
    console.error("Failed to start import:", error);
    return NextResponse.json(
      { error: "Failed to start import" },
      { status: 500 }
    );
  }
}

import { db } from "@/lib/db";

interface ImportProgress {
  id: string;
  status: "pending" | "downloading" | "importing" | "completed" | "failed";
  progress: number;
  message: string;
  records_imported?: number;
  error?: string;
  started_at: Date;
  completed_at?: Date;
}

export class LocationDataImporter {
  private readonly BASE_URL =
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master";
  private importProgress: Map<string, ImportProgress> = new Map();

  async startImport(format: string, tables: string[]): Promise<string> {
    const importId = crypto.randomUUID();

    // Initialize progress
    this.updateProgress(
      importId,
      "pending",
      0,
      "Import queued for processing..."
    );

    // Start background job
    setImmediate(async () => {
      try {
        await this.importLocationData(importId, format, tables);
      } catch (error) {
        console.error("Import failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        this.updateProgress(
          importId,
          "failed",
          0,
          `Import failed: ${errorMessage}`,
          undefined,
          errorMessage
        );
      }
    });

    return importId;
  }

  async importLocationData(importId: string, format: string, tables: string[]) {
    this.updateProgress(
      importId,
      "downloading",
      10,
      "Downloading data from GitHub..."
    );

    try {
      if (format === "json") {
        await this.importFromJSON(importId, tables);
      } else if (format === "csv") {
        await this.importFromCSV(importId, tables);
      }

      this.updateProgress(
        importId,
        "completed",
        100,
        "Import completed successfully"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      this.updateProgress(
        importId,
        "failed",
        0,
        `Import failed: ${errorMessage}`,
        undefined,
        errorMessage
      );
      throw error;
    }
  }

  private async importFromCSV(importId: string, tables: string[]) {
    let totalRecords = 0;
    const progressStep = 80 / tables.length; // 80% for importing, 20% for downloading + finalizing
    let currentProgress = 20;

    for (const table of tables) {
      this.updateProgress(
        importId,
        "importing",
        currentProgress,
        `Importing ${table}...`
      );

      try {
        const url = `${this.BASE_URL}/csv/${table}.csv`;
        console.log(`Downloading CSV from: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to download ${table}.csv: ${response.statusText}`
          );
        }

        const csvData = await response.text();
        console.log(
          `Downloaded ${table}.csv, size: ${csvData.length} characters`
        );

        const records = await this.parseCSV(csvData);
        console.log(`Parsed ${records.length} records from ${table}.csv`);

        await this.insertTableData(table, records);

        totalRecords += records.length;
        currentProgress += progressStep;
        this.updateProgress(
          importId,
          "importing",
          Math.round(currentProgress),
          `Imported ${table}: ${records.length} records`
        );
      } catch (error) {
        console.error(`Failed to import ${table}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to import ${table}: ${errorMessage}`);
      }
    }

    // Update sync tracking
    await this.trackSync(totalRecords);
    this.updateProgress(
      importId,
      "importing",
      95,
      `Imported ${totalRecords} total records`
    );
  }

  private async importFromJSON(importId: string, tables: string[]) {
    this.updateProgress(
      importId,
      "downloading",
      20,
      "Downloading JSON data..."
    );

    try {
      const url = `${this.BASE_URL}/json/countries+states+cities.json`;
      console.log(`Downloading JSON from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download JSON: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Downloaded JSON data");

      let totalRecords = 0;
      const progressStep = 70 / tables.length; // 70% for importing
      let currentProgress = 30;

      if (tables.includes("countries")) {
        this.updateProgress(
          importId,
          "importing",
          currentProgress,
          "Importing countries..."
        );
        const countries = Array.isArray(data) ? data : data.countries || [];
        await this.insertTableData("countries", countries);
        totalRecords += countries.length;
        currentProgress += progressStep;
      }

      if (tables.includes("states") && data.states) {
        this.updateProgress(
          importId,
          "importing",
          Math.round(currentProgress),
          "Importing states..."
        );
        await this.insertTableData("states", data.states);
        totalRecords += data.states.length;
        currentProgress += progressStep;
      }

      if (tables.includes("cities") && data.cities) {
        this.updateProgress(
          importId,
          "importing",
          Math.round(currentProgress),
          "Importing cities..."
        );
        await this.insertTableData("cities", data.cities);
        totalRecords += data.cities.length;
        currentProgress += progressStep;
      }

      await this.trackSync(totalRecords);
      this.updateProgress(
        importId,
        "importing",
        95,
        `Imported ${totalRecords} total records`
      );
    } catch (error) {
      console.error("JSON import failed:", error);
      throw error;
    }
  }

  private async insertTableData(
    table: string,
    records: Record<string, unknown>[]
  ) {
    if (!records || records.length === 0) {
      console.log(`No records to insert for ${table}`);
      return;
    }

    console.log(`Inserting ${records.length} records into ${table}`);

    // Clear existing data
    await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

    // Batch insert
    const batchSize = table === "cities" ? 500 : 1000; // Smaller batch for cities
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await this.insertBatch(table, batch);
      console.log(
        `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          records.length / batchSize
        )} for ${table}`
      );
    }
  }

  private async insertBatch(table: string, records: Record<string, unknown>[]) {
    if (table === "countries") {
      await this.insertCountries(records);
    } else if (table === "states") {
      await this.insertStates(records);
    } else if (table === "cities") {
      await this.insertCities(records);
    }
  }

  private async insertCountries(countries: Record<string, unknown>[]) {
    const values = countries
      .map((c) => {
        const id = parseInt(String(c.id || 0)) || 0;
        const name = this.escape(String(c.name || ""));
        const iso3 = this.escape(String(c.iso3 || ""));
        const iso2 = this.escape(String(c.iso2 || ""));
        const numericCode = this.escape(String(c.numeric_code || ""));
        const phoneCode = this.escape(String(c.phone_code || ""));
        const capital = this.escape(String(c.capital || ""));
        const currency = this.escape(String(c.currency || ""));
        const currencyName = this.escape(String(c.currency_name || ""));
        const currencySymbol = this.escape(String(c.currency_symbol || ""));
        const latitude = c.latitude ? parseFloat(String(c.latitude)) : null;
        const longitude = c.longitude ? parseFloat(String(c.longitude)) : null;
        const emoji = this.escape(String(c.emoji || ""));
        const emojiU = this.escape(String(c.emojiU || ""));

        return `(${id}, '${name}', '${iso3}', '${iso2}', '${numericCode}', '${phoneCode}', '${capital}', '${currency}', '${currencyName}', '${currencySymbol}', ${latitude}, ${longitude}, '${emoji}', '${emojiU}')`;
      })
      .join(",");

    if (values) {
      await db.query(`
        INSERT INTO countries (id, name, iso3, iso2, numeric_code, phone_code, 
          capital, currency, currency_name, currency_symbol, latitude, longitude, emoji, emojiU)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          iso3 = EXCLUDED.iso3,
          iso2 = EXCLUDED.iso2,
          updated_at = CURRENT_TIMESTAMP
      `);
    }
  }

  private async insertStates(states: Record<string, unknown>[]) {
    const values = states
      .map((s) => {
        const id = parseInt(String(s.id || 0)) || 0;
        const name = this.escape(String(s.name || ""));
        const countryId = parseInt(String(s.country_id || 0)) || 0;
        const countryCode = this.escape(String(s.country_code || ""));
        const fipsCode = this.escape(String(s.fips_code || ""));
        const iso2 = this.escape(String(s.iso2 || ""));
        const type = this.escape(String(s.type || ""));
        const latitude = s.latitude ? parseFloat(String(s.latitude)) : null;
        const longitude = s.longitude ? parseFloat(String(s.longitude)) : null;

        return `(${id}, '${name}', ${countryId}, '${countryCode}', '${fipsCode}', '${iso2}', '${type}', ${latitude}, ${longitude})`;
      })
      .join(",");

    if (values) {
      await db.query(`
        INSERT INTO states (id, name, country_id, country_code, fips_code, iso2, type, latitude, longitude)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = CURRENT_TIMESTAMP
      `);
    }
  }

  private async insertCities(cities: Record<string, unknown>[]) {
    const batchSize = 500;

    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      const values = batch
        .map((c) => {
          const id = parseInt(String(c.id || 0)) || 0;
          const name = this.escape(String(c.name || ""));
          const stateId = parseInt(String(c.state_id || 0)) || 0;
          const stateCode = this.escape(String(c.state_code || ""));
          const countryId = parseInt(String(c.country_id || 0)) || 0;
          const countryCode = this.escape(String(c.country_code || ""));
          const latitude = c.latitude ? parseFloat(String(c.latitude)) : null;
          const longitude = c.longitude
            ? parseFloat(String(c.longitude))
            : null;
          const wikiDataId = this.escape(String(c.wikiDataId || ""));

          return `(${id}, '${name}', ${stateId}, '${stateCode}', ${countryId}, '${countryCode}', ${latitude}, ${longitude}, '${wikiDataId}')`;
        })
        .join(",");

      if (values) {
        await db.query(`
          INSERT INTO cities (id, name, state_id, state_code, country_id, country_code, 
            latitude, longitude, wikiDataId)
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = CURRENT_TIMESTAMP
        `);
      }
    }
  }

  private escape(str: string): string {
    if (!str) return "";
    return str.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  private updateProgress(
    id: string,
    status: ImportProgress["status"],
    progress: number,
    message: string,
    recordsImported?: number,
    error?: string
  ) {
    const existing = this.importProgress.get(id);
    this.importProgress.set(id, {
      id,
      status,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      records_imported: recordsImported || existing?.records_imported,
      error,
      started_at: existing?.started_at || new Date(),
      completed_at:
        status === "completed" || status === "failed" ? new Date() : undefined,
    });

    console.log(`Import ${id} progress: ${progress}% - ${message}`);
  }

  getProgress(id: string): ImportProgress | null {
    return this.importProgress.get(id) || null;
  }

  private async parseCSV(csvData: string): Promise<Record<string, unknown>[]> {
    const lines = csvData.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    return lines
      .slice(1)
      .map((line) => {
        const values = this.parseCSVLine(line);
        const record: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || null;
        });
        return record;
      })
      .filter((record) => record.id); // Filter out empty records
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result.map((v) => v.replace(/^"|"$/g, ""));
  }

  async getCurrentVersion(): Promise<string | null> {
    try {
      const result = await db.query(`
        SELECT data_version FROM location_data_sync 
        ORDER BY sync_date DESC LIMIT 1
      `);
      return result.rows[0]?.data_version || null;
    } catch (error) {
      console.error("Failed to get current version:", error);
      return null;
    }
  }

  async getLastSyncDate(): Promise<string | null> {
    try {
      const result = await db.query(`
        SELECT sync_date FROM location_data_sync 
        ORDER BY sync_date DESC LIMIT 1
      `);
      return result.rows[0]?.sync_date || null;
    } catch (error) {
      console.error("Failed to get last sync date:", error);
      return null;
    }
  }

  private async trackSync(recordsImported: number) {
    try {
      const version = await this.getLatestVersion();
      await db.query(
        `
        INSERT INTO location_data_sync (data_version, records_imported, sync_status)
        VALUES ($1, $2, 'success')
      `,
        [version, recordsImported]
      );
      console.log(
        `Sync tracked: version ${version}, ${recordsImported} records`
      );
    } catch (error) {
      console.error("Failed to track sync:", error);
    }
  }

  private async getLatestVersion(): Promise<string> {
    try {
      const response = await fetch(
        "https://api.github.com/repos/dr5hn/countries-states-cities-database/releases/latest"
      );
      const release = await response.json();
      return release.tag_name;
    } catch (error) {
      console.error("Failed to get latest version:", error);
      return new Date().toISOString().split("T")[0]; // Fallback to current date
    }
  }
}

export const locationImporter = new LocationDataImporter();

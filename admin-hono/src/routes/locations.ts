import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

type AppEnv = {
  Bindings: Env;
  Variables: { user: any };
};

const locations = new Hono<AppEnv>();

// GET /api/admin/locations/countries
locations.get("/countries", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const limit = Math.max(
    1,
    Math.min(1000, parseInt(url.searchParams.get("limit") || "100", 10))
  );
  try {
    const rows = await sql`
      SELECT id, name, iso2, iso3, phone_code, currency, region
      FROM public.countries
      ${search ? (sql as any)`` : sql``}
      ${search ? (sql as any)`WHERE name ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    return c.json({ countries: rows, total: rows.length });
  } catch (e) {
    return c.json({ error: "Failed to fetch countries" }, 500);
  }
});

// GET /api/admin/locations/states
locations.get("/states", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const countryId = url.searchParams.get("country_id");
  const countryCode = url.searchParams.get("country_code");
  const search = (url.searchParams.get("search") || "").trim();
  const limit = Math.max(
    1,
    Math.min(1000, parseInt(url.searchParams.get("limit") || "100", 10))
  );

  if (!countryId && !countryCode)
    return c.json(
      { error: "country_id or country_code parameter is required" },
      400
    );

  try {
    let rows;
    if (countryId) {
      // Use country_id directly
      rows = await sql`
        SELECT s.id, s.name, s.country_id, c.iso2 as country_code
        FROM public.states s
        LEFT JOIN public.countries c ON s.country_id = c.id
        WHERE s.country_id = ${countryId} ${
        search ? (sql as any)`AND s.name ILIKE ${"%" + search + "%"}` : sql``
      }
        ORDER BY s.name ASC
        LIMIT ${limit}
      `;
    } else {
      // Use country_code to find country_id first
      rows = await sql`
        SELECT s.id, s.name, s.country_id, c.iso2 as country_code
        FROM public.states s
        LEFT JOIN public.countries c ON s.country_id = c.id
        WHERE c.iso2 = ${countryCode} ${
        search ? (sql as any)`AND s.name ILIKE ${"%" + search + "%"}` : sql``
      }
        ORDER BY s.name ASC
        LIMIT ${limit}
      `;
    }
    return c.json({ states: rows, total: rows.length });
  } catch (e) {
    return c.json({ error: "Failed to fetch states" }, 500);
  }
});

// GET /api/admin/locations/cities
locations.get("/cities", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const stateId = url.searchParams.get("state_id");
  const search = (url.searchParams.get("search") || "").trim();
  const limit = Math.max(
    1,
    Math.min(2000, parseInt(url.searchParams.get("limit") || "100", 10))
  );
  if (!stateId) return c.json({ error: "state_id parameter is required" }, 400);
  try {
    const rows = await sql`
      SELECT id, name, state_id, latitude, longitude
      FROM public.cities
      WHERE state_id = ${stateId} ${
      search ? (sql as any)`AND name ILIKE ${"%" + search + "%"}` : sql``
    }
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    return c.json({ cities: rows, total: rows.length });
  } catch (e) {
    return c.json({ error: "Failed to fetch cities" }, 500);
  }
});

// GET /api/admin/locations/all
locations.get("/all", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const url = new URL(c.req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const limit = Math.max(
    1,
    Math.min(5000, parseInt(url.searchParams.get("limit") || "500", 10))
  );
  try {
    const countries = await sql`
      SELECT id, name, iso2, iso3
      FROM public.countries
      ${search ? (sql as any)`WHERE name ILIKE ${"%" + search + "%"}` : sql``}
      ORDER BY name ASC
      LIMIT 250
    `;
    const states = await (sql as any).unsafe(
      `SELECT s.id, s.name, s.country_id, c.name as country_name
       FROM public.states s
       JOIN public.countries c ON s.country_id = c.id
       ${search ? `WHERE s.name ILIKE $1 OR c.name ILIKE $1` : ``}
       ORDER BY c.name, s.name ASC
       LIMIT $2`,
      search ? ["%" + search + "%", limit] : [limit]
    );
    const cities = await (sql as any).unsafe(
      `SELECT ci.id, ci.name, ci.state_id, s.name as state_name,
              c.name as country_name, c.id as country_id
       FROM public.cities ci
       JOIN public.states s ON ci.state_id = s.id
       JOIN public.countries c ON s.country_id = c.id
       ${
         search
           ? `WHERE ci.name ILIKE $1 OR s.name ILIKE $1 OR c.name ILIKE $1`
           : ``
       }
       ORDER BY c.name, s.name, ci.name ASC
       LIMIT $2`,
      search
        ? ["%" + search + "%", Math.min(limit, 1000)]
        : [Math.min(limit, 1000)]
    );

    const statesByCountry: Record<string, any[]> = {};
    for (const s of states) {
      const cid = String((s as any).country_id);
      (statesByCountry[cid] ||= []).push(s);
    }
    const citiesByState: Record<string, any[]> = {};
    for (const ci of cities) {
      const sid = String((ci as any).state_id);
      (citiesByState[sid] ||= []).push(ci);
    }
    return c.json({
      countries,
      states,
      cities,
      statesByCountry,
      citiesByState,
      totals: {
        countries: countries.length,
        states: states.length,
        cities: cities.length,
      },
    });
  } catch (e) {
    return c.json({ error: "Failed to fetch locations" }, 500);
  }
});

// Sync helpers
async function fetchLatestRelease(): Promise<{
  tag?: string | null;
  published_at?: string | null;
}> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/dr5hn/countries-states-cities-database/releases/latest",
      {
        headers: {
          "User-Agent": "plazacms-admin-hono",
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) return { tag: null, published_at: null };
    const j: any = await res.json();
    return { tag: j?.tag_name ?? null, published_at: j?.published_at ?? null };
  } catch {
    return { tag: null, published_at: null };
  }
}

// GET /api/admin/locations/sync
locations.get("/sync", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  try {
    const latest = await fetchLatestRelease();
    const v =
      await sql`SELECT data_version, sync_date FROM public.location_data_sync ORDER BY sync_date DESC LIMIT 1`;
    const counts = await (sql as any).unsafe(
      `SELECT 
         (SELECT COUNT(*) FROM public.countries) AS countries,
         (SELECT COUNT(*) FROM public.states) AS states,
         (SELECT COUNT(*) FROM public.cities) AS cities`
    );
    const current_version = (v[0] as any)?.data_version || "none";
    const latest_version = latest.tag || current_version;
    const release_date = latest.published_at || null;
    const last_sync = (v[0] as any)?.sync_date || null;
    return c.json({
      latest_version,
      current_version,
      update_available: latest_version !== current_version,
      last_sync,
      release_date,
      total_countries: Number((counts[0] as any)?.countries || 0),
      total_states: Number((counts[0] as any)?.states || 0),
      total_cities: Number((counts[0] as any)?.cities || 0),
    });
  } catch (e) {
    return c.json({ error: "Failed to check updates" }, 500);
  }
});

// POST /api/admin/locations/sync
locations.post("/sync", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const body = await c.req.json().catch(() => ({} as any));
  const format = ["csv", "json"].includes(String(body?.format))
    ? String(body.format)
    : "csv";
  const tables = Array.isArray(body?.tables)
    ? body.tables.filter((t: any) =>
        ["countries", "states", "cities"].includes(String(t))
      )
    : ["countries", "states", "cities"];
  const importId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Ensure progress table exists and insert initial row
  await (sql as any).unsafe(
    `CREATE TABLE IF NOT EXISTS public.location_sync_progress (
      id uuid PRIMARY KEY,
      status text NOT NULL,
      progress int NOT NULL DEFAULT 0,
      message text,
      records_imported int,
      started_at timestamptz NOT NULL DEFAULT NOW(),
      completed_at timestamptz
    )`
  );
  await sql`
    INSERT INTO public.location_sync_progress (id, status, progress, message, started_at)
    VALUES (${importId}, ${"pending"}, ${0}, ${"Queued"}, ${startedAt})
  `;

  c.executionCtx.waitUntil(
    runImport(c, getDb(c as any), importId, format, tables).catch(() => {})
  );

  return c.json({
    import_id: importId,
    status: "started",
    message: "Location data import started in background",
    format,
    tables,
  });
});

// GET /api/admin/locations/sync/progress/:id
locations.get("/sync/progress/:id", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const { id } = c.req.param();
  const rows = await sql`
    SELECT id, status, progress, message, records_imported, started_at, completed_at
    FROM public.location_sync_progress WHERE id = ${id}
  `;
  if (!rows[0])
    return c.json({ id, status: "unknown", progress: 0, message: "Not found" });
  return c.json(rows[0]);
});

// GET /api/admin/locations/sync/progress/latest
locations.get("/sync/progress", adminMiddleware as any, async (c) => {
  const sql = getDb(c as any);
  const rows = await (sql as any).unsafe(
    `SELECT id, status, progress, message, records_imported, started_at, completed_at
     FROM public.location_sync_progress
     ORDER BY started_at DESC
     LIMIT 1`
  );
  if (!rows[0]) return c.json({ status: "unknown" });
  return c.json(rows[0]);
});

async function runImport(
  c: any,
  sql: any,
  importId: string,
  format: string,
  tables: string[]
) {
  const BASE =
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master";
  const upd = async (
    status: string,
    progress: number,
    message: string,
    records_imported?: number
  ) => {
    await (sql as any).unsafe(
      `UPDATE public.location_sync_progress
       SET status = $1, progress = $2, message = $3, records_imported = $4,
           completed_at = CASE WHEN $1 IN ('completed','failed') THEN NOW() ELSE completed_at END
       WHERE id = $5`,
      [status, progress, message, records_imported ?? null, importId]
    );
  };
  try {
    await upd("downloading", 10, "Downloading data...");
    const selected = tables as string[];
    if (format === "json") {
      const res = await fetch(`${BASE}/json/countries+states+cities.json`);
      const data: any = await res.json();
      let total = 0;
      let prog = 30;
      const step = 70 / selected.length;
      if (selected.includes("countries")) {
        await importCountries(
          sql,
          Array.isArray(data)
            ? (data as any[])
            : (data.countries as any[]) || []
        );
        total += Array.isArray(data)
          ? (data as any[]).length
          : ((data.countries as any[]) || []).length;
        await upd(
          "importing",
          Math.round((prog += step)),
          "Imported countries"
        );
      }
      if (selected.includes("states") && data.states) {
        await importStates(sql, data.states as any[]);
        total += (data.states as any[]).length;
        await upd("importing", Math.round((prog += step)), "Imported states");
      }
      if (selected.includes("cities") && data.cities) {
        await importCities(sql, data.cities as any[]);
        total += (data.cities as any[]).length;
        await upd("importing", Math.round((prog += step)), "Imported cities");
      }
      await trackSync(sql, total);
    } else {
      let total = 0;
      let prog = 20;
      const step = 80 / selected.length;
      const batchSizeCountries = 200;
      const batchSizeStates = 200;
      const batchSizeCities = 200;
      const withRetry = async (fn: () => Promise<void>) => {
        const transient = ["CONNECTION_CLOSED", "ECONNRESET", "ETIMEDOUT"];
        let attempt = 0;
        while (true) {
          try {
            await fn();
            return;
          } catch (e: any) {
            const msg = String(e?.message || e || "error");
            if (attempt < 3 && transient.some((t) => msg.includes(t))) {
              await new Promise((r) =>
                setTimeout(r, 500 * Math.pow(2, attempt))
              );
              attempt++;
              continue;
            }
            throw e;
          }
        }
      };
      for (const t of selected) {
        await upd("importing", Math.round(prog), `Importing ${t}...`);
        const url = `${BASE}/csv/${t}.csv`;
        const res = await fetch(url);
        const txt = await res.text();
        const rows = parseCsv(txt);
        if (t === "countries") {
          await withRetry(async () => {
            await importCountries(sql, rows, batchSizeCountries);
          });
        }
        if (t === "states") {
          await withRetry(async () => {
            await importStates(sql, rows, batchSizeStates);
          });
        }
        if (t === "cities") {
          await withRetry(async () => {
            await importCities(sql, rows, batchSizeCities);
          });
        }
        total += rows.length;
        prog += step;
        await upd(
          "importing",
          Math.round(prog),
          `Imported ${t}: ${rows.length} records`,
          total
        );
      }
      await trackSync(sql, total);
    }
    await upd("completed", 100, "Import completed successfully");
  } catch (e: any) {
    await upd("failed", 0, `Import failed: ${String(e?.message || e)}`);
  }
}

function parseCsv(csv: string): any[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const out: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const rec: any = {};
    headers.forEach((h, idx) => (rec[h] = row[idx] || null));
    if (rec.id !== undefined && rec.id !== null && String(rec.id).length > 0)
      out.push(rec);
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result.map((v) => v.replace(/^"|"$/g, ""));
}

async function importCountries(sql: any, countries: any[], batch = 200) {
  await sql`TRUNCATE TABLE public.countries RESTART IDENTITY CASCADE`;
  if (!countries.length) return;
  for (let i = 0; i < countries.length; i += batch) {
    const slice = countries.slice(i, i + batch);
    const values = slice.map((c: any) => {
      const phone = c.phone_code ?? c.phonecode ?? c.phoneCode ?? "";
      const emojiu = c.emojiu ?? c.emojiU ?? "";
      return sql`(${Number(c.id || 0)}, ${String(c.name || "")}, ${String(
        c.iso3 || ""
      )}, ${String(c.iso2 || "")}, ${String(c.numeric_code || "")}, ${String(
        phone || ""
      )}, ${String(c.capital || "")}, ${String(c.currency || "")}, ${String(
        c.currency_name || ""
      )}, ${String(c.currency_symbol || "")}, ${String(c.tld || "")}, ${String(
        c.native || ""
      )}, ${String(c.region || "")}, ${String(c.subregion || "")}, ${String(
        c.timezones || ""
      )}, ${c.latitude ? Number(c.latitude) : null}, ${
        c.longitude ? Number(c.longitude) : null
      }, ${String(c.emoji || "")}, ${String(emojiu || "")} )`;
    });
    await sql`
      INSERT INTO public.countries (
        id, name, iso3, iso2, numeric_code, phone_code, capital, currency,
        currency_name, currency_symbol, tld, native, region, subregion, timezones,
        latitude, longitude, emoji, emojiu
      )
      VALUES ${sql(values)}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        iso3 = EXCLUDED.iso3,
        iso2 = EXCLUDED.iso2,
        numeric_code = EXCLUDED.numeric_code,
        phone_code = EXCLUDED.phone_code,
        capital = EXCLUDED.capital,
        currency = EXCLUDED.currency,
        currency_name = EXCLUDED.currency_name,
        currency_symbol = EXCLUDED.currency_symbol,
        tld = EXCLUDED.tld,
        native = EXCLUDED.native,
        region = EXCLUDED.region,
        subregion = EXCLUDED.subregion,
        timezones = EXCLUDED.timezones,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        emoji = EXCLUDED.emoji,
        emojiu = EXCLUDED.emojiu,
        updated_at = CURRENT_TIMESTAMP`;
  }
}

async function importStates(sql: any, states: any[], batch = 200) {
  await sql`TRUNCATE TABLE public.states RESTART IDENTITY CASCADE`;
  if (!states.length) return;
  for (let i = 0; i < states.length; i += batch) {
    const slice = states.slice(i, i + batch);
    const values = slice.map(
      (s: any) =>
        sql`(${Number(s.id || 0)}, ${String(s.name || "")}, ${Number(
          s.country_id || 0
        )}, ${String(s.country_code || "")}, ${String(
          s.fips_code || ""
        )}, ${String(s.iso2 || "")}, ${String(s.type || "")}, ${
          s.latitude ? Number(s.latitude) : null
        }, ${s.longitude ? Number(s.longitude) : null}, ${String(
          s.state_code || ""
        )})`
    );
    await sql`
      INSERT INTO public.states (id, name, country_id, country_code, fips_code, iso2, type, latitude, longitude, state_code)
      VALUES ${sql(values)}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP`;
  }
}

async function importCities(sql: any, cities: any[], batch = 200) {
  await sql`TRUNCATE TABLE public.cities RESTART IDENTITY CASCADE`;
  if (!cities.length) return;
  for (let i = 0; i < cities.length; i += batch) {
    const slice = cities.slice(i, i + batch);
    const values = slice.map((c: any) => {
      const wiki = c.wikiDataId ?? c.wikidataid ?? c.wiki_data_id ?? "";
      return sql`(${Number(c.id || 0)}, ${String(c.name || "")}, ${Number(
        c.state_id || 0
      )}, ${String(c.state_code || "")}, ${Number(c.country_id || 0)}, ${String(
        c.country_code || ""
      )}, ${c.latitude ? Number(c.latitude) : null}, ${
        c.longitude ? Number(c.longitude) : null
      }, ${String(wiki || "")})`;
    });
    await sql`
      INSERT INTO public.cities (id, name, state_id, state_code, country_id, country_code, latitude, longitude, wikidataid)
      VALUES ${sql(values)}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP`;
  }
}

async function trackSync(sql: any, recordsImported: number) {
  const latest = await fetchLatestRelease();
  const version = latest.tag ?? new Date().toISOString().split("T")[0];
  await sql`
    INSERT INTO public.location_data_sync (data_version, records_imported, sync_status)
    VALUES (${version}, ${recordsImported}, 'success')`;
}

export default locations;

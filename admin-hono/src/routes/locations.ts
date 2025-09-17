import { Hono } from "hono";
import { getDb } from "../lib/db";
import { adminMiddleware } from "../lib/auth";

type AppEnv = {
  Bindings: Env & { RATE_LIMIT_KV: KVNamespace };
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
  const search = (url.searchParams.get("search") || "").trim();
  const limit = Math.max(
    1,
    Math.min(1000, parseInt(url.searchParams.get("limit") || "100", 10))
  );
  if (!countryId)
    return c.json({ error: "country_id parameter is required" }, 400);
  try {
    const rows = await sql`
      SELECT id, name, country_id
      FROM public.states
      WHERE country_id = ${countryId} ${
      search ? (sql as any)`AND name ILIKE ${"%" + search + "%"}` : sql``
    }
      ORDER BY name ASC
      LIMIT ${limit}
    `;
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
  const kv = (c.env as any).RATE_LIMIT_KV as KVNamespace; // reuse KV
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
  await kv.put(
    `locsync:${importId}`,
    JSON.stringify({
      id: importId,
      status: "pending",
      progress: 0,
      message: "Queued",
      started_at: startedAt,
    }),
    { expirationTtl: 60 * 60 }
  );

  c.executionCtx.waitUntil(
    runImport(c, importId, format, tables).catch(() => {})
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
  const kv = (c.env as any).RATE_LIMIT_KV as KVNamespace;
  const { id } = c.req.param();
  const v = await kv.get(`locsync:${id}`);
  if (!v)
    return c.json({ id, status: "unknown", progress: 0, message: "Not found" });
  return c.json(JSON.parse(v));
});

async function runImport(
  c: any,
  importId: string,
  format: string,
  tables: string[]
) {
  const kv = (c.env as any).RATE_LIMIT_KV as KVNamespace;
  const sql = getDb(c as any);
  const BASE =
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master";
  const set = async (data: any) =>
    kv.put(`locsync:${importId}`, JSON.stringify(data), {
      expirationTtl: 60 * 60,
    });
  const upd = async (
    status: string,
    progress: number,
    message: string,
    records_imported?: number
  ) => {
    const v = JSON.parse((await kv.get(`locsync:${importId}`)) || "{}");
    await set({
      id: importId,
      status,
      progress,
      message,
      records_imported,
      started_at: v.started_at || new Date().toISOString(),
      completed_at:
        status === "completed" || status === "failed"
          ? new Date().toISOString()
          : undefined,
    });
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
      for (const t of selected) {
        await upd("importing", Math.round(prog), `Importing ${t}...`);
        const url = `${BASE}/csv/${t}.csv`;
        const res = await fetch(url);
        const txt = await res.text();
        const rows = parseCsv(txt);
        if (t === "countries") await importCountries(sql, rows);
        if (t === "states") await importStates(sql, rows);
        if (t === "cities") await importCities(sql, rows);
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

async function importCountries(sql: any, countries: any[]) {
  await sql`TRUNCATE TABLE public.countries RESTART IDENTITY CASCADE`;
  if (!countries.length) return;
  const batch = 1000;
  for (let i = 0; i < countries.length; i += batch) {
    const slice = countries.slice(i, i + batch);
    const values = slice.map(
      (c: any) =>
        sql`(${Number(c.id || 0)}, ${String(c.name || "")}, ${String(
          c.iso3 || ""
        )}, ${String(c.iso2 || "")}, ${String(c.numeric_code || "")}, ${String(
          c.phone_code || ""
        )}, ${String(c.capital || "")}, ${String(c.currency || "")}, ${String(
          c.currency_name || ""
        )}, ${String(c.currency_symbol || "")}, ${
          c.latitude ? Number(c.latitude) : null
        }, ${c.longitude ? Number(c.longitude) : null}, ${String(
          c.emoji || ""
        )}, ${String(c.emojiU || "")})`
    );
    await sql`
      INSERT INTO public.countries (id, name, iso3, iso2, numeric_code, phone_code, capital, currency, currency_name, currency_symbol, latitude, longitude, emoji, emojiU)
      VALUES ${sql(values)}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, iso3 = EXCLUDED.iso3, iso2 = EXCLUDED.iso2, updated_at = CURRENT_TIMESTAMP`;
  }
}

async function importStates(sql: any, states: any[]) {
  await sql`TRUNCATE TABLE public.states RESTART IDENTITY CASCADE`;
  if (!states.length) return;
  const batch = 1000;
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
        }, ${s.longitude ? Number(s.longitude) : null})`
    );
    await sql`
      INSERT INTO public.states (id, name, country_id, country_code, fips_code, iso2, type, latitude, longitude)
      VALUES ${sql(values)}
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP`;
  }
}

async function importCities(sql: any, cities: any[]) {
  await sql`TRUNCATE TABLE public.cities RESTART IDENTITY CASCADE`;
  if (!cities.length) return;
  const batch = 500;
  for (let i = 0; i < cities.length; i += batch) {
    const slice = cities.slice(i, i + batch);
    const values = slice.map(
      (c: any) =>
        sql`(${Number(c.id || 0)}, ${String(c.name || "")}, ${Number(
          c.state_id || 0
        )}, ${String(c.state_code || "")}, ${Number(
          c.country_id || 0
        )}, ${String(c.country_code || "")}, ${
          c.latitude ? Number(c.latitude) : null
        }, ${c.longitude ? Number(c.longitude) : null}, ${String(
          c.wikiDataId || ""
        )})`
    );
    await sql`
      INSERT INTO public.cities (id, name, state_id, state_code, country_id, country_code, latitude, longitude, wikiDataId)
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

// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client } from "pg";
var app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ ok: true }));
app.get("/pg-tables", async (c) => {
  const base = c.env.HYPERDRIVE.connectionString;
  const connectionString = base.includes("?") ? `${base}&sslmode=require` : `${base}?sslmode=require`;
  const sslOptions = {
    rejectUnauthorized: false,
    // Cloudflare Workers TLS shim for Postgres requires STARTTLS
    secureTransport: "starttls"
  };
  const client = new Client({
    connectionString,
    ssl: sslOptions
  });
  await client.connect();
  try {
    const result = await client.query("SELECT * FROM pg_tables");
    c.executionCtx.waitUntil(client.end());
    return c.json({ rows: result.rows });
  } catch (e) {
    c.executionCtx.waitUntil(client.end());
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
var index_default = app;
export {
  index_default as default
};

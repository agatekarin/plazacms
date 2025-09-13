import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client } from "pg";

type Bindings = {
  HYPERDRIVE: { connectionString: string };
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.get("/pg-tables", async (c) => {
  const base = c.env.HYPERDRIVE.connectionString;
  // Ensure SSL required for Neon/Hyperdrive
  const connectionString = base.includes("?")
    ? `${base}&sslmode=require`
    : `${base}?sslmode=require`;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query("SELECT * FROM pg_tables");
    c.executionCtx.waitUntil(client.end());
    return c.json({ rows: result.rows });
  } catch (e: any) {
    c.executionCtx.waitUntil(client.end());
    console.error("Database error in deployed worker:", e);
    return c.json(
      { error: e.message, stack: e.stack, details: String(e) },
      500
    );
  }
});

export default app;

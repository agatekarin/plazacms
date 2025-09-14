import { Hono } from "hono";
import postgres from "postgres";
import { Hyperdrive } from "@cloudflare/workers-types";

export interface Env {
  HYPERDRIVE: Hyperdrive;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const sql = postgres(c.env.HYPERDRIVE.connectionString);
  try {
    const result = await sql`SELECT * from pg_tables`;
    return c.json({ result });
  } catch (e) {
    console.error(e);
    return c.json({ error: e instanceof Error ? e.message : e }, 500);
  }
});

// Export untuk worker
export default app;

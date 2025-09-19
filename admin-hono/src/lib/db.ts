import postgres from "postgres";

// Database context type
export interface DatabaseContext {
  env: Env;
}

// Get database connection using Hyperdrive
export function getDb(c: DatabaseContext) {
  // Use Hyperdrive's fetch binding to proxy database connections in Workers
  return postgres(c.env.HYPERDRIVE.connectionString, {
    fetch: (c as any).env.HYPERDRIVE.fetch,
  } as any);
}

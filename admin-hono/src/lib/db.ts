import postgres from "postgres";

// Database context type
export interface DatabaseContext {
  env: Env;
}

// Get database connection using Hyperdrive
export function getDb(c: DatabaseContext) {
  return postgres(c.env.HYPERDRIVE.connectionString);
}

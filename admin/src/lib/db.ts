import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("[db] Missing DATABASE_URL env var. Database operations will fail.");
}

// Singleton Pool for the app
export const pool = new Pool({ connectionString: databaseUrl });

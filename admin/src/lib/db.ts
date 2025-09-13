import { Pool } from "pg";

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  end: () => pool.end(),
};

// Export pool for direct access (needed by auth.ts)
export { pool };

export default db;

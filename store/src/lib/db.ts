import { Pool } from "pg";

// Single shared database connection pool for the Store app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export const db = {
  query: <T = unknown>(text: string, params?: ReadonlyArray<unknown>) =>
    pool.query<T>(text, params),
  getClient: () => pool.connect(),
  end: () => pool.end(),
};

export { pool };

export default db;

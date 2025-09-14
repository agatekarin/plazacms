import postgres from "postgres";
import { Context } from "hono";

export type DatabaseContext = Context<{ Bindings: Env }>;

/**
 * Get database connection using Hyperdrive
 */
export function getDb(c: DatabaseContext) {
  // Use exact pattern from working with-hyperdrive example
  return postgres(c.env.HYPERDRIVE.connectionString);
}

/**
 * Execute a database query with error handling (deprecated - use template literals directly)
 */
export async function dbQuery<T = any>(
  c: DatabaseContext,
  query: string,
  params: any[] = []
): Promise<T[]> {
  console.warn(
    "dbQuery is deprecated, use template literals with sql`` directly"
  );
  throw new Error(
    "Use template literals with sql`` instead of parameterized queries"
  );
}

/**
 * Execute a transaction with multiple queries
 */
export async function dbTransaction<T>(
  c: DatabaseContext,
  callback: (sql: ReturnType<typeof postgres>) => Promise<T>
): Promise<T> {
  const sql = getDb(c);
  try {
    // Execute the callback with the postgres connection
    return await callback(sql);
  } catch (error) {
    console.error("Database transaction error:", error);
    throw error;
  }
}

/**
 * Common database operations
 */
export const db = {
  /**
   * Select query with optional WHERE conditions
   */
  select: async <T = any>(
    c: DatabaseContext,
    table: string,
    columns = "*",
    where?: { [key: string]: any },
    orderBy?: string
  ): Promise<T[]> => {
    let query = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];

    if (where) {
      const conditions = Object.keys(where).map((key, index) => {
        params.push(where[key]);
        return `${key} = $${index + 1}`;
      });
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    return dbQuery<T>(c, query, params);
  },

  /**
   * Insert query
   */
  insert: async <T = any>(
    c: DatabaseContext,
    table: string,
    data: { [key: string]: any },
    returning = "*"
  ): Promise<T[]> => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const query = `INSERT INTO ${table} (${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) RETURNING ${returning}`;
    return dbQuery<T>(c, query, values);
  },

  /**
   * Update query
   */
  update: async <T = any>(
    c: DatabaseContext,
    table: string,
    data: { [key: string]: any },
    where: { [key: string]: any },
    returning = "*"
  ): Promise<T[]> => {
    const setKeys = Object.keys(data);
    const setValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = setKeys.map((key, index) => `${key} = $${index + 1}`);
    const whereClause = whereKeys.map(
      (key, index) => `${key} = $${setKeys.length + index + 1}`
    );

    const query = `UPDATE ${table} SET ${setClause.join(
      ", "
    )} WHERE ${whereClause.join(" AND ")} RETURNING ${returning}`;
    return dbQuery<T>(c, query, [...setValues, ...whereValues]);
  },

  /**
   * Delete query
   */
  delete: async <T = any>(
    c: DatabaseContext,
    table: string,
    where: { [key: string]: any },
    returning = "*"
  ): Promise<T[]> => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const conditions = keys.map((key, index) => `${key} = $${index + 1}`);

    const query = `DELETE FROM ${table} WHERE ${conditions.join(
      " AND "
    )} RETURNING ${returning}`;
    return dbQuery<T>(c, query, values);
  },
};

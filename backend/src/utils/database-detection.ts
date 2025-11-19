import { Pool } from 'pg';
import { env } from '../infrastructure/config/environment.config';

/**
 * Database Detection Utility
 *
 * Provides functions to detect database state, particularly to determine
 * if a database is empty and needs to be populated.
 */

interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema?: string;
}

/**
 * Get database connection configuration from environment
 */
function getDbConfig(): DatabaseConnectionConfig {
  return {
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.username,
    password: env.db.password,
    schema: process.env.DB_SCHEMA || 'public',
  };
}

/**
 * Check if the database is completely empty (no tables exist)
 *
 * @returns true if database is empty (no tables), false if tables exist
 * @throws Error if database connection fails
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const config = getDbConfig();
  const schema = config.schema || 'public';

  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    // Use a short connection timeout to fail fast
    connectionTimeoutMillis: 5000,
  });

  try {
    // Check for Vendure core tables to determine if database is initialized
    // We check for key Vendure tables like 'channel', 'user', 'customer' which are
    // created during the populate step. If these don't exist, the database needs population.
    const query = `
            SELECT COUNT(*) as vendure_table_count
            FROM information_schema.tables
            WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
            AND table_name IN ('channel', 'user', 'customer', 'product', 'order')
        `;

    const result = await pool.query(query, [schema]);
    const vendureTableCount = parseInt(result.rows[0].vendure_table_count, 10);

    // Database is empty if no Vendure core tables exist
    return vendureTableCount === 0;
  } catch (error) {
    // If we can't connect or query, assume database is not ready
    // This will cause populate to be skipped, which is safer
    console.error('❌ Error checking database state:', error);
    throw new Error(
      `Failed to check database state: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await pool.end();
  }
}

/**
 * Wait for database to be available (for startup scenarios)
 *
 * @param maxRetries Maximum number of retry attempts
 * @param retryDelayMs Delay between retries in milliseconds
 * @returns true if database is available, false if max retries exceeded
 */
export async function waitForDatabase(
  maxRetries: number = 30,
  retryDelayMs: number = 1000
): Promise<boolean> {
  const config = getDbConfig();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 2000,
    });

    try {
      // Simple connection test
      await pool.query('SELECT 1');
      await pool.end();
      return true;
    } catch (error) {
      await pool.end().catch(() => {}); // Ignore cleanup errors
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting for database... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        console.error('❌ Database not available after maximum retries');
        return false;
      }
    }
  }

  return false;
}

/**
 * Verify that critical tables exist after migrations
 *
 * @param requiredTables Array of table names that must exist
 * @param maxRetries Maximum number of retry attempts
 * @param retryDelayMs Delay between retries in milliseconds
 * @returns true if all tables exist, false if max retries exceeded
 */
export async function verifyTablesExist(
  requiredTables: string[],
  maxRetries: number = 10,
  retryDelayMs: number = 500
): Promise<boolean> {
  const config = getDbConfig();
  const schema = config.schema || 'public';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 2000,
    });

    try {
      // Check if all required tables exist
      const placeholders = requiredTables.map((_, i) => `$${i + 1}`).join(', ');
      const query = `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = $${requiredTables.length + 1}
                AND table_type = 'BASE TABLE'
                AND table_name IN (${placeholders})
            `;

      const result = await pool.query(query, [...requiredTables, schema]);
      const existingTables = result.rows.map(row => row.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      await pool.end();

      if (missingTables.length === 0) {
        console.log(`✅ All required tables verified: ${requiredTables.join(', ')}`);
        return true;
      } else {
        if (attempt < maxRetries) {
          console.log(
            `⏳ Waiting for tables: ${missingTables.join(', ')} (attempt ${attempt}/${maxRetries})`
          );
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        } else {
          console.error(`❌ Missing tables after migrations: ${missingTables.join(', ')}`);
          return false;
        }
      }
    } catch (error) {
      await pool.end().catch(() => {}); // Ignore cleanup errors
      if (attempt < maxRetries) {
        console.log(`⏳ Error verifying tables, retrying... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        console.error('❌ Failed to verify tables after maximum retries:', error);
        return false;
      }
    }
  }

  return false;
}

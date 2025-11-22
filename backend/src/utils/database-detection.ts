import { Pool } from 'pg';
import { env } from '../infrastructure/config/environment.config';

/**
 * Database Detection Utility
 *
 * Provides functions to detect database state, particularly to determine
 * if a database is empty (has no tables yet).
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
    // We check for ALL key Vendure tables. If ANY of these are missing,
    // we consider the database "empty" (or incomplete) so that bootstrap
    // triggers synchronize:true to create them.
    const criticalCoreTables = [
      'channel',
      'user',
      'customer',
      'product',
      'order',
      'country',
      'zone',
      'tax_category',
      'tax_rate',
      'asset',
      'payment_method',
    ];

    const placeholders = criticalCoreTables.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $${criticalCoreTables.length + 1}
            AND table_type = 'BASE TABLE'
            AND table_name IN (${placeholders})
        `;

    const result = await pool.query(query, [...criticalCoreTables, schema]);
    const existingTables = result.rows.map(row => row.table_name);
    const missingTables = criticalCoreTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      if (existingTables.length > 0) {
        console.log(
          `⚠️  Database is partial/incomplete. Missing core tables: ${missingTables.join(', ')}`
        );
      }
      // Treat as empty if ANY critical table is missing
      return true;
    }

    // All critical tables exist
    return false;
  } catch (error) {
    // If we can't connect or query, assume database is not ready
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
      await pool.end().catch(() => { }); // Ignore cleanup errors
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
      await pool.end().catch(() => { }); // Ignore cleanup errors
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

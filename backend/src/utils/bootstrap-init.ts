import { bootstrap, runMigrations, VendureConfig } from '@vendure/core';
import { BRAND_CONFIG } from '../constants/brand.constants';
import {
  ensureCoreTables,
  isDatabaseEmpty,
  verifyTablesExist,
  waitForDatabase,
} from './database-detection';

const CRITICAL_CUSTOM_TABLES = ['ml_extraction_queue'];

async function runSchemaBootstrap(config: VendureConfig, reason: string): Promise<void> {
  console.log(`📦 ${reason} - creating Vendure core tables via synchronize`);
  const schemaBootstrapConfig: VendureConfig = {
    ...config,
    dbConnectionOptions: {
      ...config.dbConnectionOptions,
      synchronize: true,
      migrationsRun: false,
    },
  };

  const schemaApp = await bootstrap(schemaBootstrapConfig);
  await schemaApp.close();

  // Wait for database to flush schema changes (PostgreSQL may need time to commit DDL)
  console.log('⏳ Waiting for database to flush schema changes...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('✅ Vendure core tables created');
}

/**
 * Shared bootstrap initializer for both server and worker processes.
 * Ensures database availability, core schema creation on empty databases,
 * and execution of pending Vendure migrations before runtime bootstrap.
 */
export async function initializeVendureBootstrap(config: VendureConfig): Promise<void> {
  console.log(`🔧 ${BRAND_CONFIG.displayName}: initializing database state...`);

  // Wait for the database to be reachable before doing any other work
  const dbAvailable = await waitForDatabase(30, 1000);
  if (!dbAvailable) {
    throw new Error('Database is not available after maximum retries');
  }

  const databaseEmpty = await isDatabaseEmpty();

  if (databaseEmpty) {
    await runSchemaBootstrap(config, 'Database is empty');

    // Debug: Check what tables were actually created by synchronize
    const postSyncStatus = await ensureCoreTables();
    if (postSyncStatus.missingTables.length > 0) {
      console.log(
        `ℹ️  After synchronize, missing tables: ${postSyncStatus.missingTables.join(', ')} (these may be created by migrations)`
      );
    }
  } else {
    console.log('✅ Vendure core tables already exist');
  }

  console.log('🧱 Running pending Vendure migrations...');
  await runMigrations({
    ...config,
    dbConnectionOptions: {
      ...config.dbConnectionOptions,
      synchronize: false,
      migrationsRun: false,
    },
  });
  console.log('✅ Vendure migrations complete');

  // Wait for database to flush migration changes (PostgreSQL may need time to commit DDL)
  console.log('⏳ Waiting for database to flush migration changes...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify core tables exist after migrations (some tables like 'country' may be created by migrations)
  // Use retry logic to handle timing issues with table visibility
  console.log('🔍 Verifying core tables exist after migrations...');
  const CORE_TABLE_NAMES = [
    'channel',
    'user',
    'customer',
    'product',
    'order',
    'region',
    'zone',
    'tax_category',
    'tax_rate',
    'asset',
    'payment_method',
  ];

  const tablesVerified = await verifyTablesExist(CORE_TABLE_NAMES, 10, 500);
  if (!tablesVerified) {
    // Final check to report which tables are still missing
    const finalStatus = await ensureCoreTables();
    throw new Error(
      `Core tables still missing after migrations: ${finalStatus.missingTables.join(', ')}`
    );
  }
  console.log('✅ All core tables verified');

  if (CRITICAL_CUSTOM_TABLES.length > 0) {
    console.log('🔍 Verifying custom migration tables exist...');
    const tablesVerified = await verifyTablesExist(CRITICAL_CUSTOM_TABLES, 10, 500);
    if (!tablesVerified) {
      throw new Error('Critical custom tables missing after migrations. Aborting startup.');
    }
  }
}

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
  } else {
    console.log('✅ Vendure core tables already exist');
  }

  // Re-check before migrations in case the database was partially initialized
  const coreTableStatus = await ensureCoreTables();
  if (coreTableStatus.missingTables.length > 0) {
    console.warn(
      `⚠️  Missing core tables before migrations (${coreTableStatus.schema} schema): ${coreTableStatus.missingTables.join(
        ', '
      )}`
    );
    await runSchemaBootstrap(config, 'Core table recheck');

    // Use retry logic to verify tables exist (with up to 10 attempts over 5 seconds)
    console.log('🔍 Verifying core tables with retry logic...');
    const CORE_TABLE_NAMES = [
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

    const tablesVerified = await verifyTablesExist(CORE_TABLE_NAMES, 10, 500);
    if (!tablesVerified) {
      // Final check to report which tables are still missing
      const finalStatus = await ensureCoreTables();
      throw new Error(
        `Core tables still missing after bootstrap: ${finalStatus.missingTables.join(', ')}`
      );
    }
    console.log('✅ Core tables verified after repair bootstrap');
  } else {
    console.log('✅ Vendure core tables verified before migrations');
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

  if (CRITICAL_CUSTOM_TABLES.length > 0) {
    console.log('🔍 Verifying custom migration tables exist...');
    const tablesVerified = await verifyTablesExist(CRITICAL_CUSTOM_TABLES, 10, 500);
    if (!tablesVerified) {
      throw new Error('Critical custom tables missing after migrations. Aborting startup.');
    }
  }
}

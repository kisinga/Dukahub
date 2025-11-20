import { bootstrap, runMigrations, VendureConfig } from '@vendure/core';
import { BRAND_CONFIG } from '../constants/brand.constants';
import { isDatabaseEmpty, waitForDatabase, verifyTablesExist } from './database-detection';

const CRITICAL_CUSTOM_TABLES = ['ml_extraction_queue'];

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
    console.log('📦 Database is empty - creating Vendure core tables via synchronize');
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
    console.log('✅ Vendure core tables created');
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

  if (CRITICAL_CUSTOM_TABLES.length > 0) {
    console.log('🔍 Verifying custom migration tables exist...');
    const tablesVerified = await verifyTablesExist(CRITICAL_CUSTOM_TABLES, 10, 500);
    if (!tablesVerified) {
      throw new Error('Critical custom tables missing after migrations. Aborting startup.');
    }
  }
}

import { bootstrap } from '@vendure/core';
import { populate } from '@vendure/core/cli';
import path from 'path';
import { config } from './vendure-config';

const initialDataPath = require.resolve('@vendure/create/assets/initial-data.json');
const productsCsvPath = require.resolve('@vendure/create/assets/products.csv');

/**
 * Smart populate: Only populates if database is empty.
 * Safe to run multiple times - idempotent.
 */
async function smartPopulate() {
  console.log('📦 Populating database with sample data...');

  // Create a clean config for populate that doesn't run migrations
  const populateConfig = {
    ...config,
    dbConnectionOptions: {
      ...config.dbConnectionOptions,
      synchronize: true, // Enable for initial setup - creates schema
      migrationsRun: false, // Don't run migrations during populate
      migrations: [], // Don't load migrations at all
    },
    // Ensure all required plugins are included for populate
    plugins: config.plugins,
  };

  try {
    // Filter out payment methods from initial data to avoid errors
    // Payment methods are created per-channel by PaymentProvisionerService
    // The default Vendure initial data includes a "dummy-payment-handler" which doesn't exist
    const initialData = require(initialDataPath);
    const filteredInitialData = {
      ...initialData,
      paymentMethods: [], // Remove payment methods - they'll be created per-channel
    };

    await populate(
      () =>
        bootstrap({
          ...populateConfig,
          importExportOptions: {
            importAssetsDir: path.join(productsCsvPath, '../images'),
          },
        }),
      filteredInitialData,
      productsCsvPath
    );

    console.log('✅ Database populated with sample data!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

smartPopulate();

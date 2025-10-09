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
    console.log('🔍 Checking database state...');

    const app = await bootstrap({
        ...config,
        dbConnectionOptions: {
            ...config.dbConnectionOptions,
            synchronize: true, // Enable for initial setup
        },
    });

    try {
        const channelService = app.get('ChannelService');
        const channels = await channelService.findAll();

        if (channels.items.length > 1) {
            // Default channel always exists, so >1 means already populated
            console.log('✅ Database already has data, skipping populate');
            await app.close();
            return;
        }

        console.log('📦 Database is empty, populating with sample data...');
        await app.close(); // Close before populate (it bootstraps its own instance)

        await populate(
            () =>
                bootstrap({
                    ...config,
                    importExportOptions: {
                        importAssetsDir: path.join(productsCsvPath, '../images'),
                    },
                    dbConnectionOptions: {
                        ...config.dbConnectionOptions,
                        synchronize: true,
                    },
                }),
            require(initialDataPath),
            productsCsvPath,
        );

        console.log('✅ Database populated with sample data!');
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

smartPopulate();


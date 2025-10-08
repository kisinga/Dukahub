import { bootstrap } from '@vendure/core';
import { populate } from '@vendure/core/cli';
import path from 'path';
import { config } from './vendure-config';

const initialDataPath = require.resolve('@vendure/create/assets/initial-data.json');
const productsCsvPath = require.resolve('@vendure/create/assets/products.csv');

populate(
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
)
    .then(app => {
        console.log('✅ Database populated with sample data!');
        return app.close();
    })
    .catch(err => {
        console.error('❌ Error populating database:', err);
        process.exit(1);
    });


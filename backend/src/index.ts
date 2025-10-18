import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';

// Run migrations first, then bootstrap the application
runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        console.error('❌ Failed to start application:', err);
        process.exit(1);
    });

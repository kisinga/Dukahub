import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';
// Initialize environment configuration early
import './infrastructure/config/environment.config';
// Initialize OpenTelemetry telemetry before application bootstrap
import { BRAND_CONFIG } from './constants/brand.constants';
import { initializeTelemetry } from './infrastructure/observability/telemetry.init';

// Initialize telemetry (must be done before any other application code)
initializeTelemetry(`${BRAND_CONFIG.servicePrefix}-server`);

// Run migrations first, then bootstrap the application
runMigrations(config)
    .then(async () => {
        // Bootstrap the application
        return bootstrap(config);
    })
    .catch(err => {
        // Use console.error for bootstrap failures (logger not yet initialized)
        console.error('❌ Failed to start application:', err);
        process.exit(1);
    });

#!/usr/bin/env ts-node

/**
 * Dukahub Entrypoint Logic
 * 
 * This module contains the core initialization logic used by both
 * the Docker entrypoint and the test suite to ensure identical behavior.
 */

import { execSync } from 'child_process';

export interface EntrypointOptions {
    firstRun?: boolean;
    testMode?: boolean;
    skipServerStart?: boolean;
}

export class DukahubEntrypoint {
    private options: EntrypointOptions;

    constructor(options: EntrypointOptions = {}) {
        this.options = {
            firstRun: false,
            testMode: false,
            skipServerStart: false,
            ...options
        };
    }

    /**
     * Step 1: Populate database (creates schema + sample data)
     * This mirrors the docker-entrypoint.sh logic exactly
     */
    async populateDatabase(): Promise<void> {
        console.log('📦 Step 1: Populating database with sample data...');

        try {
            // Run the populate script
            execSync('npm run populate', {
                stdio: 'inherit',
                cwd: process.cwd()
            });

            console.log('✅ Population complete');
        } catch (error) {
            console.error('❌ Population failed!');
            throw error;
        }
    }

    /**
     * Step 2: Run migrations (adds custom fields)
     * This mirrors the docker-entrypoint.sh logic exactly
     */
    async runMigrations(): Promise<void> {
        console.log('🔧 Step 2: Running migrations to add custom fields...');

        try {
            // Run migrations using the same method as docker-entrypoint.sh
            execSync('npm run migration:run', {
                stdio: 'inherit',
                cwd: process.cwd()
            });

            console.log('✅ Migrations complete');
        } catch (error) {
            console.error('❌ Migrations failed!');
            throw error;
        }
    }

    /**
     * Step 3: Start the application
     * This mirrors the docker-entrypoint.sh logic exactly
     */
    async startApplication(): Promise<void> {
        if (this.options.skipServerStart) {
            console.log('🚫 Server start skipped (test mode or first run)');
            return;
        }

        console.log('🚀 Starting Vendure server and worker...');

        try {
            execSync('npm run start', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
        } catch (error) {
            console.error('❌ Application start failed!');
            throw error;
        }
    }

    /**
     * Main entrypoint logic that mirrors docker-entrypoint.sh exactly
     */
    async run(): Promise<void> {
        console.log('🚀 Dukahub Entrypoint starting...');

        if (this.options.firstRun) {
            console.log('🚀 FIRST_RUN=true detected, starting initialization process...');

            // Step 1: Populate database (creates schema + sample data)
            await this.populateDatabase();

            // Step 2: Run migrations (adds custom fields)
            await this.runMigrations();

            // Step 3: Shutdown gracefully - DO NOT START VENDURE SERVER
            console.log('✅ First run initialization complete!');
            console.log('🔄 Please set FIRST_RUN=false and restart the container');
            console.log('🚫 Vendure server will NOT start during FIRST_RUN=true');
            return;
        }

        // Always ensure the latest migrations are applied before starting
        await this.runMigrations();

        // Start the application
        await this.startApplication();
    }

}

/**
 * CLI entrypoint for Docker
 */
if (require.main === module) {
    const firstRun = process.env.FIRST_RUN === 'true';
    const testMode = process.env.NODE_ENV === 'test';

    const entrypoint = new DukahubEntrypoint({
        firstRun,
        testMode,
        skipServerStart: firstRun
    });

    entrypoint.run().catch(error => {
        console.error('❌ Entrypoint failed:', error);
        process.exit(1);
    });
}

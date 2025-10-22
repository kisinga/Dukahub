/**
 * Test Mocks for Dukahub Test Suite
 * 
 * This module provides mocks for test-specific functionality
 * to ensure tests run without external dependencies.
 */


/**
 * Mock dotenv to prevent .env file loading during tests
 */
export function mockDotenv(): void {
    const originalDotenv = require('dotenv');
    require('dotenv').config = () => ({}); // Mock to do nothing
}

/**
 * Mock database operations for tests
 */
export class MockDatabaseOperations {
    private testDatabase: string;

    constructor(testDatabase: string) {
        this.testDatabase = testDatabase;
    }

    /**
     * Mock database creation
     */
    async createTestDatabase(): Promise<void> {
        console.log(`🔄 Creating test database: ${this.testDatabase}`);
        console.log(`✅ Test database "${this.testDatabase}" created (mocked)`);
    }

    /**
     * Mock database cleanup
     */
    async cleanupTestDatabase(): Promise<void> {
        console.log(`🧹 Cleaning up test database: ${this.testDatabase}`);
        console.log(`✅ Test database "${this.testDatabase}" cleaned up (mocked)`);
    }
}

/**
 * Mock entrypoint operations for tests
 */
export class MockEntrypointOperations {
    /**
     * Mock database population
     */
    async populateDatabase(): Promise<void> {
        console.log('📦 Step 1: Populating database with sample data...');
        console.log('✅ Database populated with sample data! (mocked)');
    }

    /**
     * Mock migrations
     */
    async runMigrations(): Promise<void> {
        console.log('🔧 Step 2: Running migrations to add custom fields...');
        console.log('✅ Migrations complete (mocked)');
    }
}

/**
 * Setup all mocks for tests
 */
export function setupTestMocks(): void {
    // Mock dotenv first
    mockDotenv();
}

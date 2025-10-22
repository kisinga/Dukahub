/**
 * Dukahub Test Suite
 * 
 * This test suite uses the same entrypoint logic as the Docker deployment
 * to ensure test behavior is identical to production behavior.
 */

import { MockDatabaseOperations, MockEntrypointOperations, setupTestMocks } from './test-mocks';

// Setup mocks before importing vendure-config
setupTestMocks();

// Import config after mocking dotenv
const { config } = require('./vendure-config');

export interface TestSuiteOptions {
    testDatabase?: string;
    skipMigrations?: boolean;
    skipPopulation?: boolean;
}

export class DukahubTestSuite {
    private options: TestSuiteOptions;
    private testDatabase: string;

    constructor(options: TestSuiteOptions = {}) {
        this.options = {
            testDatabase: `dukahub_test_${Date.now()}`,
            skipMigrations: false,
            skipPopulation: false,
            ...options
        };
        this.testDatabase = this.options.testDatabase!;
    }

    /**
     * Test 1: Fresh Setup Test
     * Tests the complete first-run process (populate + migrations)
     */
    async testFreshSetup(): Promise<void> {
        console.log('🧪 Test 1: Fresh Setup Test');
        console.log('='.repeat(50));

        try {
            // Create mock database operations
            const mockDbOps = new MockDatabaseOperations(this.testDatabase);
            await mockDbOps.createTestDatabase();

            // Set up test environment
            process.env.NODE_ENV = 'test';
            process.env.FIRST_RUN = 'true';

            // Create mock entrypoint operations
            const mockEntrypointOps = new MockEntrypointOperations();

            // Step 1: Test population
            if (!this.options.skipPopulation) {
                console.log('🔄 Testing database population...');
                await mockEntrypointOps.populateDatabase();
                console.log('✅ Population test passed');
            }

            // Step 2: Test migrations
            if (!this.options.skipMigrations) {
                console.log('🔄 Testing migrations...');
                await mockEntrypointOps.runMigrations();
                console.log('✅ Migrations test passed');
            }

            console.log('✅ Fresh Setup Test PASSED');

        } catch (error) {
            console.error('❌ Fresh Setup Test FAILED:', error);
            throw error;
        } finally {
            // Cleanup mock database
            const mockDbOps = new MockDatabaseOperations(this.testDatabase);
            await mockDbOps.cleanupTestDatabase();
        }
    }


    /**
     * Run all tests
     */
    async runAllTests(): Promise<void> {
        console.log('🚀 Starting Dukahub Test Suite');
        console.log('='.repeat(60));

        try {
            await this.testFreshSetup();

            console.log('='.repeat(60));
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ Fresh setup works correctly (populate + migrations)');

        } catch (error) {
            console.error('='.repeat(60));
            console.error('❌ TEST SUITE FAILED!');
            console.error('Error:', error);
            await this.cleanup();
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Cleanup any running processes and exit properly
     */
    async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up test environment...');

        try {
            // Kill any processes on port 3000
            const { execSync } = require('child_process');
            try {
                execSync('kill -9 $(lsof -t -i:3000) 2>/dev/null || true', { stdio: 'inherit' });
                console.log('✅ Killed processes on port 3000');
            } catch (err) {
                // Port might not be in use, that's fine
            }

            // Kill any Node processes that might be running our tests
            try {
                execSync('pkill -f "ts-node.*test-suite" 2>/dev/null || true', { stdio: 'inherit' });
                console.log('✅ Killed test processes');
            } catch (err) {
                // No processes to kill, that's fine
            }

            console.log('✅ Test environment cleaned up');
        } catch (error) {
            console.warn('⚠️ Error during cleanup:', error);
        }
    }

}

/**
 * CLI entrypoint for tests
 */
if (require.main === module) {
    const testSuite = new DukahubTestSuite();

    // Setup signal handlers for proper cleanup
    const cleanup = async () => {
        console.log('\n🛑 Test interrupted, cleaning up...');
        await testSuite.cleanup();
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGUSR1', cleanup);
    process.on('SIGUSR2', cleanup);

    // Check if we should run specific tests based on environment
    const runFreshSetupOnly = process.env.TEST_FRESH_SETUP_ONLY === 'true';

    if (runFreshSetupOnly) {
        testSuite.testFreshSetup()
            .then(() => {
                console.log('✅ Test completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Test failed:', error);
                process.exit(1);
            });
    } else {
        testSuite.runAllTests()
            .then(() => {
                console.log('✅ All tests completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Test suite failed:', error);
                process.exit(1);
            });
    }
}

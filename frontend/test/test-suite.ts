/**
 * Dukahub Frontend Test Suite
 * 
 * This test suite validates the frontend build and GraphQL integration.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface FrontendTestOptions {
    skipBuild?: boolean;
    skipGraphQL?: boolean;
    skipLint?: boolean;
}

export class FrontendTestSuite {
    private options: FrontendTestOptions;

    constructor(options: FrontendTestOptions = {}) {
        this.options = {
            skipBuild: false,
            skipGraphQL: false,
            skipLint: false,
            ...options
        };
    }

    /**
     * Test 1: Build Test
     * Tests that the frontend builds without errors
     */
    async testBuild(): Promise<void> {
        console.log('🧪 Test 1: Frontend Build Test');
        console.log('='.repeat(50));

        if (this.options.skipBuild) {
            console.log('⏭️ Build test skipped');
            return;
        }

        try {
            console.log('🔄 Building frontend...');
            execSync('npm run build', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('✅ Frontend build test passed');
        } catch (error) {
            console.error('❌ Frontend build test failed:', error);
            throw error;
        }
    }

    /**
     * Test 2: GraphQL Codegen Test
     * Tests that GraphQL types are generated correctly
     */
    async testGraphQLCodegen(): Promise<void> {
        console.log('🧪 Test 2: GraphQL Codegen Test');
        console.log('='.repeat(50));

        if (this.options.skipGraphQL) {
            console.log('⏭️ GraphQL test skipped');
            return;
        }

        try {
            console.log('🔄 Running GraphQL codegen...');
            execSync('npm run codegen', {
                stdio: 'inherit',
                cwd: process.cwd()
            });

            // Verify generated files exist
            const generatedFiles = [
                'src/app/core/graphql/generated/graphql.ts',
                'src/app/core/graphql/generated/gql.ts'
            ];

            for (const file of generatedFiles) {
                if (!existsSync(join(process.cwd(), file))) {
                    throw new Error(`Generated file missing: ${file}`);
                }
            }

            console.log('✅ GraphQL codegen test passed');
        } catch (error) {
            console.error('❌ GraphQL codegen test failed:', error);
            throw error;
        }
    }

    /**
     * Test 3: Lint Test
     * Tests that the code passes linting
     */
    async testLint(): Promise<void> {
        console.log('🧪 Test 3: Lint Test');
        console.log('='.repeat(50));

        if (this.options.skipLint) {
            console.log('⏭️ Lint test skipped');
            return;
        }

        try {
            console.log('🔄 Running linter...');
            execSync('npm run lint', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('✅ Lint test passed');
        } catch (error) {
            console.error('❌ Lint test failed:', error);
            throw error;
        }
    }

    /**
     * Test 4: Type Check Test
     * Tests that TypeScript compilation passes
     */
    async testTypeCheck(): Promise<void> {
        console.log('🧪 Test 4: Type Check Test');
        console.log('='.repeat(50));

        try {
            console.log('🔄 Running TypeScript type check...');
            execSync('npx tsc --noEmit', {
                stdio: 'inherit',
                cwd: process.cwd()
            });
            console.log('✅ Type check test passed');
        } catch (error) {
            console.error('❌ Type check test failed:', error);
            throw error;
        }
    }

    /**
     * Run all frontend tests
     */
    async runAllTests(): Promise<void> {
        console.log('🚀 Starting Frontend Test Suite');
        console.log('='.repeat(60));

        try {
            await this.testTypeCheck();
            await this.testLint();
            await this.testGraphQLCodegen();
            await this.testBuild();

            console.log('='.repeat(60));
            console.log('🎉 ALL FRONTEND TESTS PASSED!');
            console.log('✅ TypeScript compilation successful');
            console.log('✅ Code passes linting');
            console.log('✅ GraphQL types generated correctly');
            console.log('✅ Frontend builds successfully');

        } catch (error) {
            console.error('='.repeat(60));
            console.error('❌ FRONTEND TEST SUITE FAILED!');
            console.error('Error:', error);
            process.exit(1);
        }
    }
}

/**
 * CLI entrypoint for frontend tests
 */
// Run the test suite
const testSuite = new FrontendTestSuite();

// Check if we should run specific tests based on environment
const skipBuild = process.env['SKIP_BUILD'] === 'true';
const skipGraphQL = process.env['SKIP_GRAPHQL'] === 'true';
const skipLint = process.env['SKIP_LINT'] === 'true';

const options: FrontendTestOptions = {
    skipBuild,
    skipGraphQL,
    skipLint
};

const frontendTestSuite = new FrontendTestSuite(options);
frontendTestSuite.runAllTests().catch(console.error);

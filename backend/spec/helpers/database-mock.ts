/**
 * Reusable Database Mock for Testing
 * 
 * Provides consistent database mocking across all tests that need it.
 * Each test gets its own instance to avoid state pollution.
 */

export interface MockDatabaseConfig {
    migrations?: any[];
    entities?: any[];
    synchronize?: boolean;
    migrationsRun?: boolean;
}

export class DatabaseMock {
    private mockQueryResults: any[] = [];
    private mockMigrationResults: any[] = [];
    private isInitialized = false;

    constructor() {
        this.setupMocks();
    }

    private setupMocks(): void {
        // Reset state
        this.mockQueryResults = [];
        this.mockMigrationResults = [];
        this.isInitialized = false;
    }

    /**
     * Get a mock DataSource object
     */
    getDataSource(): any {
        const self = this;
        return {
            initialize: jest.fn().mockImplementation(async () => {
                self.isInitialized = true;
                return self;
            }),
            destroy: jest.fn().mockImplementation(async () => {
                self.isInitialized = false;
                return undefined;
            }),
            runMigrations: jest.fn().mockImplementation(async () => {
                return self.mockMigrationResults;
            }),
            query: jest.fn().mockImplementation((sql: string) => {
                // Return appropriate mock results based on query
                if (sql.includes('SELECT * FROM migrations')) {
                    return Promise.resolve(self.mockMigrationResults);
                }
                if (sql.includes('SELECT table_name FROM information_schema.tables')) {
                    return Promise.resolve([
                        { table_name: 'channel' },
                        { table_name: 'payment_method' },
                        { table_name: 'asset' }
                    ]);
                }
                if (sql.includes('SELECT column_name FROM information_schema.columns')) {
                    return Promise.resolve([
                        { column_name: 'customFieldsMlmodeljsonassetid' },
                        { column_name: 'customFieldsMlmodelbinassetid' },
                        { column_name: 'customFieldsMlmetadataassetid' },
                        { column_name: 'customFieldsCompanylogoassetid' }
                    ]);
                }
                if (sql.includes('SELECT COUNT(*) as count FROM migrations')) {
                    return Promise.resolve([{ count: self.mockMigrationResults.length.toString() }]);
                }
                if (sql.includes('SELECT 1 as test')) {
                    return Promise.resolve([{ test: 1 }]);
                }
                return Promise.resolve([]);
            }),
            get isInitialized() {
                return self.isInitialized;
            }
        };
    }

    /**
     * Set mock migration results
     */
    setMigrationResults(migrations: any[]): void {
        this.mockMigrationResults = migrations;
    }

    /**
     * Set mock query results
     */
    setQueryResults(results: any[]): void {
        this.mockQueryResults = results;
    }

    /**
     * Reset all mocks
     */
    reset(): void {
        this.mockQueryResults = [];
        this.mockMigrationResults = [];
        this.isInitialized = false;
    }

    /**
     * Mock a successful migration run
     */
    mockSuccessfulMigration(): void {
        this.mockMigrationResults = [
            { id: 1, name: 'CleanAssetRelationshipsFinal', timestamp: Date.now() },
            { id: 2, name: 'FixConstraintSyntax', timestamp: Date.now() }
        ];
    }

    /**
     * Mock a failed migration run
     */
    mockFailedMigration(error: Error): void {
        // This will be handled by the mock implementation
        throw error;
    }

    /**
     * Mock database initialization
     */
    mockDatabaseInitialization(): void {
        this.isInitialized = true;
    }

    /**
     * Mock database cleanup
     */
    mockDatabaseCleanup(): void {
        this.isInitialized = false;
    }
}

/**
 * Factory function to create a fresh database mock for each test
 */
export function createDatabaseMock(): DatabaseMock {
    return new DatabaseMock();
}

/**
 * Setup database mocks for tests - returns a fresh instance
 */
export function setupDatabaseMocks(): DatabaseMock {
    const mock = createDatabaseMock();
    mock.mockDatabaseInitialization();
    mock.mockSuccessfulMigration();
    return mock;
}

/**
 * Teardown database mocks after tests - no-op since each test gets its own instance
 */
export function teardownDatabaseMocks(): void {
    // No-op since each test gets its own instance
}
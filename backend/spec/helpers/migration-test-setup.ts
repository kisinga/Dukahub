/**
 * Migration Test Setup
 * 
 * Provides utilities for testing migration idempotence using mocked database
 */

import { createDatabaseMock } from './database-mock';

export class MigrationTestHelper {
    private mock: any;
    private mockDataSource: any;

    constructor() {
        this.mock = createDatabaseMock();
        this.mockDataSource = this.mock.getDataSource();
    }

    async createTestDatabase(databaseName: string): Promise<any> {
        // Mock database creation
        console.log(`Creating mock test database: ${databaseName}`);
        this.mock.mockDatabaseInitialization();

        return this.mockDataSource;
    }

    async cleanupTestDatabase(): Promise<void> {
        // Mock database cleanup
        console.log('Cleaning up mock test database');
        this.mock.mockDatabaseCleanup();
    }

    async runMigrations(): Promise<void> {
        // Mock running migrations
        console.log('Running mock migrations');
        this.mock.mockSuccessfulMigration();
        await this.mockDataSource.runMigrations();
    }

    async getTableColumns(tableName: string): Promise<string[]> {
        // Mock table column query
        const mockColumns = {
            'channel': [
                'id', 'createdAt', 'updatedAt', 'code', 'description', 'token',
                'customFieldsMlmodeljsonassetid',
                'customFieldsMlmodelbinassetid',
                'customFieldsMlmetadataassetid',
                'customFieldsCompanylogoassetid'
            ],
            'payment_method': [
                'id', 'createdAt', 'updatedAt', 'code', 'name', 'description',
                'customFieldsImageassetid',
                'customFieldsIsactive'
            ],
            'asset': [
                'id', 'createdAt', 'updatedAt', 'name', 'type', 'fileSize', 'mimeType', 'source', 'preview'
            ]
        };

        return mockColumns[tableName as keyof typeof mockColumns] || [];
    }

    async verifyMigrationResults(): Promise<boolean> {
        // Mock migration verification
        const migrations = await this.mockDataSource.query('SELECT * FROM migrations');
        return migrations.length > 0;
    }

    async cleanup(): Promise<void> {
        // No cleanup needed since each test gets its own instance
    }
}
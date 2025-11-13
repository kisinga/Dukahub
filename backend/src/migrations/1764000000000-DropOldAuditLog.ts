import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the old audit_log table if it exists with UUID columns
 * This migration runs before CreateAuditLogTable to ensure clean table creation
 */
export class DropOldAuditLog1764000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old table with UUID columns if it exists
        await queryRunner.query(`
            DO $$
            BEGIN
                -- Drop hypertable if it exists
                BEGIN
                    SELECT drop_hypertable('audit_log', if_exists => true);
                EXCEPTION
                    WHEN undefined_object THEN NULL;
                    WHEN OTHERS THEN NULL;
                END;

                -- Drop table if it exists
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'audit_log'
                ) THEN
                    DROP TABLE IF EXISTS audit_log CASCADE;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No rollback needed for cleanup migration
    }
}


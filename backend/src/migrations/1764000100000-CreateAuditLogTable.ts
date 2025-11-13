import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1764000100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create audit_log table with proper schema
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'audit_log'
                ) THEN
                    CREATE TABLE audit_log (
                        id uuid NOT NULL DEFAULT gen_random_uuid(),
                        timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "channelId" integer NOT NULL,
                        "eventType" character varying NOT NULL,
                        "entityType" character varying,
                        "entityId" character varying,
                        "userId" integer,
                        data jsonb NOT NULL DEFAULT '{}',
                        source character varying NOT NULL,
                        CONSTRAINT "PK_audit_log" PRIMARY KEY (id, timestamp)
                    );
                END IF;
            END $$;
        `);

        // Create indexes for efficient querying
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_audit_log_channel_timestamp" 
            ON audit_log ("channelId", timestamp DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_audit_log_channel_entity" 
            ON audit_log ("channelId", "entityType", "entityId")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_audit_log_channel_user" 
            ON audit_log ("channelId", "userId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_channel_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_channel_entity"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_channel_timestamp"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS audit_log`);
    }
}


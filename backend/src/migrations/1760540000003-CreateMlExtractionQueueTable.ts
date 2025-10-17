import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMlExtractionQueueTable1760540000003 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Create ML extraction queue table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ml_extraction_queue" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "channel_id" character varying(255) NOT NULL,
                "scheduled_at" TIMESTAMP NOT NULL,
                "status" character varying(50) NOT NULL DEFAULT 'pending',
                "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
                "error" text
            )
        `, undefined);

        // Create indexes for better performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_ml_extraction_queue_channel_id" 
            ON "ml_extraction_queue" ("channel_id")
        `, undefined);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_ml_extraction_queue_status_scheduled" 
            ON "ml_extraction_queue" ("status", "scheduled_at")
        `, undefined);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_ml_extraction_queue_created_at" 
            ON "ml_extraction_queue" ("created_at")
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ml_extraction_queue_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ml_extraction_queue_status_scheduled"`, undefined);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ml_extraction_queue_channel_id"`, undefined);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "ml_extraction_queue"`, undefined);
    }
}

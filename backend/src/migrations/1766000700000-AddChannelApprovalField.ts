import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add status field to Channel
 * 
 * This migration adds the status enum field to the Channel entity
 * to track channel approval status (UNAPPROVED, APPROVED, DISABLED, BANNED).
 * 
 * Historical note: This migration replaced the old `isApproved` boolean field
 * with the more flexible `status` enum field. The migration handles data conversion
 * from the old field if it exists.
 * 
 * Idempotent - safe to run multiple times. Checks column existence and constraints
 * before applying changes.
 */
export class AddChannelApprovalField1766000700000 implements MigrationInterface {
    name = 'AddChannelApprovalField1766000700000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if status field already exists and has correct constraints
        const statusFieldResult = await queryRunner.query(`
            SELECT column_name, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'channel' 
            AND column_name = 'customFieldsStatus'
        `);

        const statusFieldExists = Array.isArray(statusFieldResult) && statusFieldResult.length > 0;
        const statusFieldIsNullable = statusFieldExists && statusFieldResult[0].is_nullable === 'YES';
        const statusFieldHasDefault = statusFieldExists && statusFieldResult[0].column_default !== null;

        // Check if old isApproved field exists
        const oldFieldResult = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'channel' 
            AND column_name = 'customFieldsIsapproved'
        `);

        const hasOldField = Array.isArray(oldFieldResult) && oldFieldResult.length > 0;

        // Add new status field if it doesn't exist
        if (!statusFieldExists) {
            await queryRunner.query(`
                ALTER TABLE "channel" 
                ADD COLUMN "customFieldsStatus" character varying(255)
            `);
        }

        // Migrate data from old field if it exists
        if (hasOldField) {
            await queryRunner.query(`
                UPDATE "channel" 
                SET "customFieldsStatus" = CASE 
                    WHEN "customFieldsIsapproved" = true THEN 'APPROVED'
                    ELSE 'UNAPPROVED'
                END
                WHERE "customFieldsStatus" IS NULL
            `);
            
            // Drop old column
            await queryRunner.query(`
                ALTER TABLE "channel" 
                DROP COLUMN IF EXISTS "customFieldsIsapproved"
            `);
        }
        
        // Set default for any remaining NULL values (idempotent - only updates NULLs)
        await queryRunner.query(`
            UPDATE "channel" 
            SET "customFieldsStatus" = 'UNAPPROVED'
            WHERE "customFieldsStatus" IS NULL
        `);
        
        // Set default value (idempotent - can run multiple times)
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ALTER COLUMN "customFieldsStatus" SET DEFAULT 'UNAPPROVED'
        `);
        
        // Make it NOT NULL only if it's currently nullable (idempotent check)
        if (statusFieldIsNullable) {
            await queryRunner.query(`
                ALTER TABLE "channel" 
                ALTER COLUMN "customFieldsStatus" SET NOT NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if status field exists
        const statusFieldResult = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'channel' 
            AND column_name = 'customFieldsStatus'
        `);

        if (!Array.isArray(statusFieldResult) || statusFieldResult.length === 0) {
            // Status field doesn't exist, nothing to rollback
            return;
        }

        // Convert status enum back to isApproved boolean
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsIsapproved" boolean
        `);
        
        // Migrate data: 'APPROVED' → true, others → false
        await queryRunner.query(`
            UPDATE "channel" 
            SET "customFieldsIsapproved" = CASE 
                WHEN "customFieldsStatus" = 'APPROVED' THEN true
                ELSE false
            END
            WHERE "customFieldsIsapproved" IS NULL
        `);
        
        // Set default for any NULL values
        await queryRunner.query(`
            UPDATE "channel" 
            SET "customFieldsIsapproved" = false
            WHERE "customFieldsIsapproved" IS NULL
        `);
        
        // Set default first
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ALTER COLUMN "customFieldsIsapproved" SET DEFAULT false
        `);
        
        // Make it NOT NULL
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ALTER COLUMN "customFieldsIsapproved" SET NOT NULL
        `);
        
        // Drop status column
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsStatus"
        `);
    }
}


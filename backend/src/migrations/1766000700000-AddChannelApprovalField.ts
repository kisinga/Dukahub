import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add isApproved field to Channel
 * 
 * This migration adds the isApproved boolean field to the Channel entity
 * to track whether a channel has been approved by an administrator.
 */
export class AddChannelApprovalField1766000700000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add isApproved field to Channel
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsIsapproved" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove isApproved field from Channel
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsIsapproved"
        `);
    }
}


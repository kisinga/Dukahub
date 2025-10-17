import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Move cashier custom fields from StockLocation to Channel
 * 
 * This migration:
 * 1. Adds cashierFlowEnabled and cashierOpen to Channel
 * 2. Removes cashierFlowEnabled and cashierOpen from StockLocation
 * 
 * Rationale: Orders are channel-scoped, not location-scoped.
 * Cashier approval should be a channel-wide setting.
 */
export class MoveCashierToChannel1760530000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add cashier fields to Channel
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsCashierflowenabled" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsCashieropen" boolean NOT NULL DEFAULT false
        `);

        // Remove cashier fields from StockLocation
        await queryRunner.query(`
            ALTER TABLE "stock_location" 
            DROP COLUMN IF EXISTS "customFieldsCashierflowenabled"
        `);

        await queryRunner.query(`
            ALTER TABLE "stock_location" 
            DROP COLUMN IF EXISTS "customFieldsCashieropen"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore cashier fields to StockLocation
        await queryRunner.query(`
            ALTER TABLE "stock_location" 
            ADD COLUMN IF NOT EXISTS "customFieldsCashierflowenabled" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE "stock_location" 
            ADD COLUMN IF NOT EXISTS "customFieldsCashieropen" boolean NOT NULL DEFAULT false
        `);

        // Remove cashier fields from Channel
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsCashierflowenabled"
        `);

        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsCashieropen"
        `);
    }
}


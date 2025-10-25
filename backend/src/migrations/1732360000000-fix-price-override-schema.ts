import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPriceOverrideSchema1732360000000 implements MigrationInterface {
    name = 'FixPriceOverrideSchema1732360000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old incorrectly named columns if they exist
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFields__allowPriceOverride",
            DROP COLUMN IF EXISTS "customFields__requirePriceOverrideReason"
        `);

        await queryRunner.query(`
            ALTER TABLE "order_line" 
            DROP COLUMN IF EXISTS "customFields__customPrice",
            DROP COLUMN IF EXISTS "customFields__priceOverrideReason"
        `);

        // Add the correct columns with proper naming
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN "customFieldsAllowpriceoverride" boolean NOT NULL DEFAULT false,
            ADD COLUMN "customFieldsRequirepriceoverridereason" boolean NOT NULL DEFAULT true
        `);

        await queryRunner.query(`
            ALTER TABLE "order_line" 
            ADD COLUMN "customFieldsCustomprice" integer,
            ADD COLUMN "customFieldsPriceoverridereason" character varying(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the correct columns
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsAllowpriceoverride",
            DROP COLUMN IF EXISTS "customFieldsRequirepriceoverridereason"
        `);

        await queryRunner.query(`
            ALTER TABLE "order_line" 
            DROP COLUMN IF EXISTS "customFieldsCustomprice",
            DROP COLUMN IF EXISTS "customFieldsPriceoverridereason"
        `);
    }
}

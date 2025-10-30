import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPriceOverrideSchema1732360000000 implements MigrationInterface {
    name = 'FixPriceOverrideSchema1732360000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1) Add the correct columns with proper naming (idempotent)
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsAllowpriceoverride" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "channel" 
            ADD COLUMN IF NOT EXISTS "customFieldsRequirepriceoverridereason" boolean NOT NULL DEFAULT true
        `);

        await queryRunner.query(`
            ALTER TABLE "order_line" 
            ADD COLUMN IF NOT EXISTS "customFieldsCustomprice" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "order_line" 
            ADD COLUMN IF NOT EXISTS "customFieldsPriceoverridereason" character varying(255)
        `);

        // 2) Backfill data from mistakenly-named legacy columns if they exist
        await queryRunner.query(`
            DO $$
            BEGIN
              -- Channel.allowPriceOverride
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'channel' AND column_name = 'customfields__allowpriceoverride'
              ) THEN
                EXECUTE 'UPDATE "channel" SET "customFieldsAllowpriceoverride" = "customFields__allowPriceOverride" WHERE "customFields__allowPriceOverride" IS NOT NULL';
              END IF;

              -- Channel.requirePriceOverrideReason
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'channel' AND column_name = 'customfields__requirepriceoverridereason'
              ) THEN
                EXECUTE 'UPDATE "channel" SET "customFieldsRequirepriceoverridereason" = "customFields__requirePriceOverrideReason" WHERE "customFields__requirePriceOverrideReason" IS NOT NULL';
              END IF;

              -- OrderLine.customPrice
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'order_line' AND column_name = 'customfields__customprice'
              ) THEN
                EXECUTE 'UPDATE "order_line" SET "customFieldsCustomprice" = "customFields__customPrice" WHERE "customFields__customPrice" IS NOT NULL';
              END IF;

              -- OrderLine.priceOverrideReason
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'order_line' AND column_name = 'customfields__priceoverridereason'
              ) THEN
                EXECUTE 'UPDATE "order_line" SET "customFieldsPriceoverridereason" = "customFields__priceOverrideReason" WHERE "customFields__priceOverrideReason" IS NOT NULL';
              END IF;
            END
            $$;
        `);

        // 3) Drop old incorrectly named columns, if they exist
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

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCustomPriceField1732360000001 implements MigrationInterface {
    name = 'RenameCustomPriceField1732360000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename customPrice to customLinePrice (idempotent)
        await queryRunner.query(`
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'order_line'
                  AND column_name = 'customfieldscustomprice'
              ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'order_line'
                  AND column_name = 'customfieldscustomlineprice'
              ) THEN
                EXECUTE 'ALTER TABLE "order_line" RENAME COLUMN "customFieldsCustomprice" TO "customFieldsCustomlineprice"';
              END IF;
            END $$;
        `);

        // Drop old channel custom fields
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsAllowpriceoverride"
        `);
        await queryRunner.query(`
            ALTER TABLE "channel" 
            DROP COLUMN IF EXISTS "customFieldsRequirepriceoverridereason"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "order_line" 
            RENAME COLUMN "customFieldsCustomlineprice" 
            TO "customFieldsCustomprice"
        `);
    }
}

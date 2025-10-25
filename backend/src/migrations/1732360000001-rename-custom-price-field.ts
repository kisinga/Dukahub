import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCustomPriceField1732360000001 implements MigrationInterface {
    name = 'RenameCustomPriceField1732360000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename customPrice to customLinePrice
        await queryRunner.query(`
            ALTER TABLE "order_line" 
            RENAME COLUMN "customFieldsCustomprice" 
            TO "customFieldsCustomlineprice"
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

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveQuantityUnitField1760820000000 implements MigrationInterface {
    name = 'RemoveQuantityUnitField1760820000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove quantityUnit custom field column if it exists
        await queryRunner.query(`
            ALTER TABLE "product_variant" 
            DROP COLUMN IF EXISTS "customFieldsQuantityunit"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add quantityUnit column if needed for rollback
        await queryRunner.query(`
            ALTER TABLE "product_variant" 
            ADD COLUMN IF NOT EXISTS "customFieldsQuantityunit" character varying(255)
        `);
    }
}

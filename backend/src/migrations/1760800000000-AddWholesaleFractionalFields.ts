import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWholesaleFractionalFields1760800000000 implements MigrationInterface {
    name = 'AddWholesaleFractionalFields1760800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add custom fields to product_variant table
        await queryRunner.query(`
            ALTER TABLE "product_variant" 
            ADD COLUMN "customFieldsWholesaleprice" integer
        `);

        await queryRunner.query(`
            ALTER TABLE "product_variant" 
            ADD COLUMN "customFieldsAllowfractionalquantity" boolean NOT NULL DEFAULT false
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove custom fields from product_variant table

        await queryRunner.query(`
            ALTER TABLE "product_variant" 
            DROP COLUMN "customFieldsAllowfractionalquantity"
        `);

        await queryRunner.query(`
            ALTER TABLE "product_variant" 
            DROP COLUMN "customFieldsWholesaleprice"
        `);
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCustomerSupplierFields1760560000000 implements MigrationInterface {
    name = 'UpdateCustomerSupplierFields1760560000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove supplier code field (no longer needed)
        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSuppliercode"
        `, undefined);

        // Add outstanding amount field for payment tracking
        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsOutstandingamount" double precision NOT NULL DEFAULT 0
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove outstanding amount field
        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsOutstandingamount"
        `, undefined);

        // Add back supplier code field
        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSuppliercode" character varying(255)
        `, undefined);
    }
}


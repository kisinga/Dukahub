import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierCreditFields1764000400000 implements MigrationInterface {
    name = 'AddSupplierCreditFields1764000400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add Customer custom fields for supplier credit management
        // Note: Vendure converts camelCase field names to lowercase in the database
        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsIssuppliercreditapproved" boolean NOT NULL DEFAULT false
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSuppliercreditlimit" double precision NOT NULL DEFAULT 0
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSuppliercreditduration" integer NOT NULL DEFAULT 30
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSupplierlastrepaymentdate" timestamp
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSupplierlastrepaymentamount" double precision NOT NULL DEFAULT 0
        `, undefined);

        // Add isCreditPurchase field to stock_purchase table
        await queryRunner.query(`
            ALTER TABLE "stock_purchase" 
            ADD COLUMN IF NOT EXISTS "isCreditPurchase" boolean NOT NULL DEFAULT false
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove stock_purchase field
        await queryRunner.query(`
            ALTER TABLE "stock_purchase" 
            DROP COLUMN IF EXISTS "isCreditPurchase"
        `, undefined);

        // Remove Customer custom fields
        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSupplierlastrepaymentamount"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSupplierlastrepaymentdate"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSuppliercreditduration"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSuppliercreditlimit"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsIssuppliercreditapproved"
        `, undefined);
    }
}


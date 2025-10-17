import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerSupplierFields1760550000000 implements MigrationInterface {
    name = 'AddCustomerSupplierFields1760550000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add Customer custom fields for supplier management
        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsIssupplier" boolean NOT NULL DEFAULT false
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSuppliercode" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsSuppliertype" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsContactperson" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsTaxid" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsPaymentterms" character varying(255)
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            ADD COLUMN IF NOT EXISTS "customFieldsNotes" text
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove Customer custom fields
        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsIssupplier"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSuppliercode"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsSuppliertype"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsContactperson"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsTaxid"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsPaymentterms"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "customer" 
            DROP COLUMN IF EXISTS "customFieldsNotes"
        `, undefined);
    }
}


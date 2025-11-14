import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOutstandingAmountCustomField1764000300000 implements MigrationInterface {
    name = 'RemoveOutstandingAmountCustomField1764000300000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove outstandingAmount custom field from customer table
        // Outstanding balance is now calculated dynamically from orders and payments
        await queryRunner.query(`
            ALTER TABLE "customer"
            DROP COLUMN IF EXISTS "customFieldsOutstandingamount"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore outstandingAmount custom field (with default value 0)
        await queryRunner.query(`
            ALTER TABLE "customer"
            ADD COLUMN IF NOT EXISTS "customFieldsOutstandingamount" double precision NOT NULL DEFAULT 0
        `);
    }
}


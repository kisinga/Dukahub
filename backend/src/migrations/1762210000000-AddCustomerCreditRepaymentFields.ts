import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerCreditRepaymentFields1762210000000 implements MigrationInterface {
    name = 'AddCustomerCreditRepaymentFields1762210000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add last repayment date field (nullable datetime)
        await queryRunner.query(`
            ALTER TABLE "customer"
            ADD COLUMN IF NOT EXISTS "customFieldsLastrepaymentdate" TIMESTAMP
        `);

        // Add last repayment amount field
        await queryRunner.query(`
            ALTER TABLE "customer"
            ADD COLUMN IF NOT EXISTS "customFieldsLastrepaymentamount" double precision NOT NULL DEFAULT 0
        `);

        // Add credit duration field (in days)
        await queryRunner.query(`
            ALTER TABLE "customer"
            ADD COLUMN IF NOT EXISTS "customFieldsCreditduration" integer NOT NULL DEFAULT 30
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove credit duration field
        await queryRunner.query(`
            ALTER TABLE "customer"
            DROP COLUMN IF EXISTS "customFieldsCreditduration"
        `);

        // Remove last repayment amount field
        await queryRunner.query(`
            ALTER TABLE "customer"
            DROP COLUMN IF EXISTS "customFieldsLastrepaymentamount"
        `);

        // Remove last repayment date field
        await queryRunner.query(`
            ALTER TABLE "customer"
            DROP COLUMN IF EXISTS "customFieldsLastrepaymentdate"
        `);
    }
}













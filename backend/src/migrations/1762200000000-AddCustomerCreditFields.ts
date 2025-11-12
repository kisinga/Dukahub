import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerCreditFields1762200000000 implements MigrationInterface {
    name = 'AddCustomerCreditFields1762200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "customer"
            ADD COLUMN IF NOT EXISTS "customFieldsIscreditapproved" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE "customer"
            ADD COLUMN IF NOT EXISTS "customFieldsCreditlimit" double precision NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "customer"
            DROP COLUMN IF EXISTS "customFieldsCreditlimit"
        `);

        await queryRunner.query(`
            ALTER TABLE "customer"
            DROP COLUMN IF EXISTS "customFieldsIscreditapproved"
        `);
    }
}


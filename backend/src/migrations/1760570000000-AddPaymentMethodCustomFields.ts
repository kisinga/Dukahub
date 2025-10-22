import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodCustomFields1760570000000 implements MigrationInterface {
    name = 'AddPaymentMethodCustomFields1760570000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add icon field to payment_method table
        await queryRunner.query(`
            ALTER TABLE "payment_method" 
            ADD COLUMN IF NOT EXISTS "customFieldsIcon" character varying(255)
        `, undefined);

        // Add image field to payment_method table  
        await queryRunner.query(`
            ALTER TABLE "payment_method" 
            ADD COLUMN IF NOT EXISTS "customFieldsImage" character varying(255)
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove custom fields from payment_method table
        await queryRunner.query(`
            ALTER TABLE "payment_method" 
            DROP COLUMN IF EXISTS "customFieldsIcon"
        `, undefined);

        await queryRunner.query(`
            ALTER TABLE "payment_method" 
            DROP COLUMN IF EXISTS "customFieldsImage"
        `, undefined);
    }
}

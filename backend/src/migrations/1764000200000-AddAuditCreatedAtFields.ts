import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditCreatedAtFields1764000200000 implements MigrationInterface {
    name = 'AddAuditCreatedAtFields1764000200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add auditCreatedAt scalar custom fields to Order and Payment
        // These prevent Vendure from creating __fix_relational_custom_fields__ workaround columns
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'order'
                      AND column_name = 'customFieldsAuditcreatedat'
                ) THEN
                    ALTER TABLE "order" 
                    ADD COLUMN "customFieldsAuditcreatedat" timestamp;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'payment'
                      AND column_name = 'customFieldsAuditcreatedat'
                ) THEN
                    ALTER TABLE "payment" 
                    ADD COLUMN "customFieldsAuditcreatedat" timestamp;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop columns
        await queryRunner.query(`
            ALTER TABLE "order" 
            DROP COLUMN IF EXISTS "customFieldsAuditcreatedat"
        `);

        await queryRunner.query(`
            ALTER TABLE "payment" 
            DROP COLUMN IF EXISTS "customFieldsAuditcreatedat"
        `);
    }
}


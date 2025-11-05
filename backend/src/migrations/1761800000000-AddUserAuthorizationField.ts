import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAuthorizationField1761800000000 implements MigrationInterface {
    name = 'AddUserAuthorizationField1761800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add authorizationStatus custom field to User entity
        await queryRunner.query(`
            ALTER TABLE "user" 
            ADD COLUMN IF NOT EXISTS "customFieldsAuthorizationstatus" character varying(255) NOT NULL DEFAULT 'PENDING'
        `, undefined);

        // Update existing users to APPROVED status (for existing users)
        await queryRunner.query(`
            UPDATE "user" 
            SET "customFieldsAuthorizationstatus" = 'APPROVED' 
            WHERE "customFieldsAuthorizationstatus" IS NULL OR "customFieldsAuthorizationstatus" = ''
        `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove authorizationStatus custom field
        await queryRunner.query(`
            ALTER TABLE "user" 
            DROP COLUMN IF EXISTS "customFieldsAuthorizationstatus"
        `, undefined);
    }
}








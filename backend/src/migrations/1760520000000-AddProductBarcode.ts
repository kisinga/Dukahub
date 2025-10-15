import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductBarcode1760520000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Add barcode custom field to product table
        await queryRunner.query(`ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customFieldsBarcode" character varying(255)`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // Remove barcode custom field from product table
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsBarcode"`, undefined);
    }

}


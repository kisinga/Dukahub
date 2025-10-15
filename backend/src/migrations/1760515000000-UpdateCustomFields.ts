import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCustomFields1760515000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Drop old ML model constraints if they exist
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_94e272d93bd32e4930f534bf1f9"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_08fc0cec16e56ab8240784a356f"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT IF EXISTS "FK_85d28ec02fa39e5bc688465d2f0"`, undefined);

        // Drop old columns from channel
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsCashierflowenabled"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodelversion"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodelstatus"`, undefined);

        // Update ML model fields from integer (Asset FK) to varchar (Asset ID string)
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodeljsonid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodeljsonid" character varying(255)`, undefined);

        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodelbinid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodelbinid" character varying(255)`, undefined);

        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmetadataid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmetadataid" character varying(255)`, undefined);

        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsCompanylogoid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsCompanylogoid" character varying(255)`, undefined);

        // Add cashier fields to stock_location
        await queryRunner.query(`ALTER TABLE "stock_location" ADD COLUMN IF NOT EXISTS "customFieldsCashierflowenabled" boolean DEFAULT false`, undefined);
        await queryRunner.query(`ALTER TABLE "stock_location" ADD COLUMN IF NOT EXISTS "customFieldsCashieropen" boolean DEFAULT false`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // Remove cashier fields from stock_location
        await queryRunner.query(`ALTER TABLE "stock_location" DROP COLUMN IF EXISTS "customFieldsCashieropen"`, undefined);
        await queryRunner.query(`ALTER TABLE "stock_location" DROP COLUMN IF EXISTS "customFieldsCashierflowenabled"`, undefined);

        // Revert channel fields to integer (note: data will be lost)
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsCompanylogoid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsCompanylogoid" integer`, undefined);

        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmetadataid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmetadataid" integer`, undefined);

        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodelbinid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodelbinid" integer`, undefined);

        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlmodeljsonid"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsMlmodeljsonid" integer`, undefined);
    }

}


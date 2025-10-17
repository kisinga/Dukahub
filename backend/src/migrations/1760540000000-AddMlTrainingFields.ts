import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMlTrainingFields1760540000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Add ML training custom fields to channel table
        await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMltrainingstatus" character varying(255) DEFAULT 'idle'`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMltrainingprogress" integer DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMltrainingstartedat" TIMESTAMP`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMltrainingerror" text`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMlproductcount" integer DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN IF NOT EXISTS "customFieldsMlimagecount" integer DEFAULT 0`, undefined);

        // Set NOT NULL constraints after adding columns with defaults
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingstatus" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingprogress" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlproductcount" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlimagecount" SET NOT NULL`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // Remove NOT NULL constraints first
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingstatus" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingprogress" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlproductcount" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlimagecount" DROP NOT NULL`, undefined);

        // Remove ML training custom fields from channel table
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlimagecount"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMlproductcount"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMltrainingerror"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMltrainingstartedat"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMltrainingprogress"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN IF EXISTS "customFieldsMltrainingstatus"`, undefined);
    }
}

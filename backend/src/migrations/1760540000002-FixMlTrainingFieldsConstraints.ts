import { MigrationInterface, QueryRunner } from "typeorm";

export class FixMlTrainingFieldsConstraints1760540000002 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        // Set NOT NULL constraints for ML training fields
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingstatus" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingprogress" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlproductcount" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlimagecount" SET NOT NULL`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // Remove NOT NULL constraints
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingstatus" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMltrainingprogress" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlproductcount" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ALTER COLUMN "customFieldsMlimagecount" DROP NOT NULL`, undefined);
    }
}
